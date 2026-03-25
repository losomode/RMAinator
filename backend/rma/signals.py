from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.contrib.contenttypes.models import ContentType
from .models import RMA, RMAStateHistory
from notifications.utils import (
    send_rma_state_change_email,
    send_new_rma_notification_to_admins,
    send_rma_rejection_email,
    send_rma_completed_email,
)
from audit.models import AuditLog


@receiver(pre_save, sender=RMA)
def track_rma_changes(sender, instance, **kwargs):
    """Track RMA changes before save for audit logging."""
    if instance.pk:
        try:
            old_instance = RMA.objects.get(pk=instance.pk)
            
            # Track state changes
            if old_instance.state != instance.state:
                instance._state_changed = True
                instance._old_state = old_instance.state
            
            # Track all field changes for audit log
            instance._field_changes = {}
            
            # List of fields to audit
            audited_fields = [
                'state', 'priority', 'serial_number', 'device_type', 'ipn',
                'first_ship_date', 'fault_notes', 'rma_received_date', 'return_date',
                'root_cause', 'parts_replaced', 'cost_to_repair', 'device_mac',
                'return_tracking_number', 'rejection_reason',
                'qa_reflashed', 'qa_image_version', 'qa_nvme_data_ok',
                'qa_services_ok', 'qa_uptime_ok', 'qa_stream_uptime_ok', 'qa_lens_control_ok',
                'repair_notes',
            ]
            
            for field in audited_fields:
                old_val = getattr(old_instance, field)
                new_val = getattr(instance, field)
                if old_val != new_val:
                    instance._field_changes[field] = {
                        'old': str(old_val) if old_val is not None else None,
                        'new': str(new_val) if new_val is not None else None
                    }
        except RMA.DoesNotExist:
            pass


@receiver(post_save, sender=RMA)
def create_state_history_and_audit(sender, instance, created, **kwargs):
    """Create state history, audit logs, and send notifications after RMA is saved."""
    content_type = ContentType.objects.get_for_model(RMA)
    user = getattr(instance, '_changed_by', instance.owner)
    
    if created:
        # New RMA created - record initial state
        RMAStateHistory.objects.create(
            rma=instance,
            from_state='',
            to_state=instance.state,
            changed_by=instance.owner
        )
        
        # Create audit log for creation
        AuditLog.objects.create(
            content_type=content_type,
            object_id=instance.pk,
            action=AuditLog.Action.CREATE,
            user=user,
            notes=f"RMA #{instance.rma_number} created"
        )
        
        # Send notification to admins about new RMA
        send_new_rma_notification_to_admins(instance)
        
    else:
        # RMA updated - check for changes
        if hasattr(instance, '_state_changed') and instance._state_changed:
            # State changed - record transition
            old_state = instance._old_state
            new_state = instance.state
            
            RMAStateHistory.objects.create(
                rma=instance,
                from_state=old_state,
                to_state=new_state,
                changed_by=user
            )
            
            # Create audit log for state change
            AuditLog.objects.create(
                content_type=content_type,
                object_id=instance.pk,
                action=AuditLog.Action.STATE_CHANGE,
                user=user,
                field_name='state',
                old_value=old_state,
                new_value=new_state
            )
            
            # Send appropriate email based on new state
            if new_state == RMA.State.REJECTED:
                send_rma_rejection_email(instance)
            elif new_state == RMA.State.COMPLETED:
                send_rma_completed_email(instance)
            else:
                # Send general state change notification
                send_rma_state_change_email(instance, old_state, new_state)
        
        # Log all other field changes
        if hasattr(instance, '_field_changes'):
            for field_name, values in instance._field_changes.items():
                # Skip state since we already logged it above
                if field_name == 'state':
                    continue
                
                AuditLog.objects.create(
                    content_type=content_type,
                    object_id=instance.pk,
                    action=AuditLog.Action.UPDATE,
                    user=user,
                    field_name=field_name,
                    old_value=values['old'],
                    new_value=values['new']
                )
