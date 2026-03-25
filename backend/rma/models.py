from django.db import models
from django.conf import settings
from django.utils import timezone as _tz
from datetime import date


class RMAGroup(models.Model):
    """Model for grouping multiple RMAs submitted together."""
    name = models.CharField(max_length=255, blank=True, help_text="Optional display name for this group")
    company_id = models.IntegerField(
        null=True,
        blank=True,
        db_index=True,
        help_text="Company ID from USERinator"
    )
    return_shipping_address = models.TextField(blank=True, help_text="Address to ship repaired devices back to")
    created_at = models.DateTimeField(default=_tz.now)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='rma_groups'
    )

    @property
    def device_count(self):
        """Return the number of RMAs in this group."""
        return self.rmas.count()

    @property
    def owner(self):
        """Alias for created_by for consistency with RMA model."""
        return self.created_by

    def __str__(self):
        if self.name:
            return f"RMA Group {self.id} — {self.name}"
        return f"RMA Group {self.id} - {self.created_at.strftime('%Y-%m-%d')}"

    class Meta:
        ordering = ['-created_at']


class RMA(models.Model):
    """Main RMA model with all fields from specification."""

    class State(models.TextChoices):
        SUBMITTED = 'SUBMITTED', 'Submitted'
        APPROVED = 'APPROVED', 'Approved'
        REJECTED = 'REJECTED', 'Rejected'
        RECEIVED = 'RECEIVED', 'Received'
        DIAGNOSED = 'DIAGNOSED', 'Diagnosed'
        REPAIRED = 'REPAIRED', 'Repaired'
        REPLACED = 'REPLACED', 'Replaced'
        IN_QA = 'IN_QA', 'In QA / Pre-Shipment Testing'
        READY_FOR_RETURN = 'READY_FOR_RETURN', 'Ready for Return, Awaiting Shipment'
        SHIPPED = 'SHIPPED', 'Shipped'
        COMPLETED = 'COMPLETED', 'Completed'
    
    class Priority(models.TextChoices):
        LOW = 'LOW', 'Low'
        NORMAL = 'NORMAL', 'Normal'
        HIGH = 'HIGH', 'High'
    
    # RMA identification and ownership
    rma_number = models.IntegerField(unique=True, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='rmas'
    )
    company_id = models.IntegerField(
        null=True,
        blank=True,
        db_index=True,
        help_text="Company ID from USERinator (denormalized for efficient filtering)"
    )
    group = models.ForeignKey(
        RMAGroup,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='rmas'
    )
    
    # State and priority
    state = models.CharField(
        max_length=20,
        choices=State.choices,
        default=State.SUBMITTED
    )
    priority = models.CharField(
        max_length=10,
        choices=Priority.choices,
        default=Priority.NORMAL
    )
    
    # Device information (user-submitted)
    serial_number = models.CharField(max_length=100, db_index=True)
    device_type = models.CharField(max_length=100, blank=True, help_text="e.g. TX2 Camera, Orin Node")
    ipn = models.CharField(max_length=100, blank=True, help_text="Internal Part Number (optional)")
    fault_notes = models.TextField(blank=True, help_text="Issue description and other comments")
    
    # Dates (first_ship_date is admin-only but stored per device)
    first_ship_date = models.DateField(null=True, blank=True)

    # RMA dates (system-managed)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    rma_received_date = models.DateField(null=True, blank=True)
    return_date = models.DateField(null=True, blank=True)

    # Admin-only technical fields
    root_cause = models.TextField(blank=True)
    parts_replaced = models.JSONField(default=list, blank=True, help_text="List of parts replaced")
    cost_to_repair = models.CharField(max_length=100, blank=True)
    device_mac = models.CharField(max_length=17, blank=True, help_text="MAC address in format XX:XX:XX:XX:XX:XX")
    return_tracking_number = models.CharField(max_length=200, blank=True)

    # Repair QA Checklist (admin-only)
    qa_reflashed = models.BooleanField(default=False)
    qa_image_version = models.CharField(max_length=100, blank=True, help_text="Firmware/image version after re-flash")
    qa_nvme_data_ok = models.BooleanField(default=False)
    qa_services_ok = models.BooleanField(default=False)
    qa_uptime_ok = models.BooleanField(default=False)
    qa_stream_uptime_ok = models.BooleanField(default=False)
    qa_lens_control_ok = models.BooleanField(default=False)

    # Internal repair notes (admin-only free text)
    repair_notes = models.TextField(blank=True, help_text="Internal repair notes and observations")

    # Rejection reason (if rejected)
    rejection_reason = models.TextField(blank=True)
    
    # Calculated field
    @property
    def years_in_field(self):
        """Calculate years device was in field before RMA."""
        if self.first_ship_date and self.rma_received_date:
            delta = self.rma_received_date - self.first_ship_date
            return round(delta.days / 365.25, 2)
        return None
    
    @property
    def is_archived(self):
        """Check if RMA is archived (completed or rejected)."""
        return self.state in [self.State.COMPLETED, self.State.REJECTED]
    
    def save(self, *args, **kwargs):
        # Auto-generate RMA number if not set
        if not self.rma_number:
            last_rma = RMA.objects.all().order_by('-rma_number').first()
            self.rma_number = (last_rma.rma_number + 1) if last_rma else 1
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"RMA #{self.rma_number} - SN: {self.serial_number}"
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['serial_number']),
            models.Index(fields=['state']),
            models.Index(fields=['owner']),
            models.Index(fields=['company_id']),
        ]


class RMAStateHistory(models.Model):
    """Model to track RMA state transitions."""
    rma = models.ForeignKey(
        RMA,
        on_delete=models.CASCADE,
        related_name='state_history'
    )
    from_state = models.CharField(max_length=20, blank=True)
    to_state = models.CharField(max_length=20)
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True
    )
    changed_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)
    
    def __str__(self):
        return f"RMA #{self.rma.rma_number}: {self.from_state} -> {self.to_state}"
    
    class Meta:
        ordering = ['-changed_at']
        verbose_name_plural = 'RMA state histories'


class RMAAttachment(models.Model):
    """Model for file attachments to RMAs."""
    rma = models.ForeignKey(
        RMA,
        on_delete=models.CASCADE,
        related_name='attachments'
    )
    file = models.FileField(upload_to='rma_attachments/%Y/%m/%d/')
    filename = models.CharField(max_length=255)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)
    file_size = models.IntegerField(help_text="File size in bytes")
    
    def __str__(self):
        return f"{self.filename} - RMA #{self.rma.rma_number}"
    
    class Meta:
        ordering = ['-uploaded_at']
