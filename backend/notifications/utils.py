"""
Email notification utilities for RMAinator.
"""
from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string
from django.contrib.auth import get_user_model

User = get_user_model()


def get_admin_emails():
    """
    Get list of admin email addresses.
    
    NOTE: Since authentication is handled by Authinator, we use Django's
    built-in is_staff/is_superuser flags to identify admins in the database.
    In a real deployment, admin emails would be configured via environment
    variables or pulled from Authinator API.
    """
    # Use Django's built-in admin flags
    return list(User.objects.filter(is_staff=True).values_list('email', flat=True))


def send_rma_state_change_email(rma, old_state, new_state):
    """
    Send email to RMA owner when state changes.
    
    Args:
        rma: RMA instance
        old_state: Previous state
        new_state: New state
    """
    subject = f'RMA #{rma.rma_number} Status Update: {new_state}'
    
    # Plain text message
    message = f"""
Hello {rma.owner.username},

Your RMA #{rma.rma_number} has been updated.

Device: {rma.serial_number}
Previous Status: {old_state}
New Status: {new_state}

You can view the complete details at: http://localhost:5173/rma/{rma.id}

Thank you,
RMAinator Team
"""
    
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[rma.owner.email],
            fail_silently=False,
        )
        return True
    except Exception as e:
        print(f"Failed to send RMA state change email: {e}")
        return False


def send_new_rma_notification_to_admins(rma):
    """
    Send email to admins when a new RMA is submitted.
    
    Args:
        rma: RMA instance
    """
    admin_emails = get_admin_emails()
    if not admin_emails:
        return False
    
    subject = f'New RMA Submitted: #{rma.rma_number}'
    
    message = f"""
A new RMA has been submitted and requires review.

RMA Number: #{rma.rma_number}
Serial Number: {rma.serial_number}
Owner: {rma.owner.username} ({rma.owner.email})
Priority: {rma.priority}
Issue: {rma.fault_notes[:200]}{'...' if len(rma.fault_notes) > 200 else ''}

Please review and approve/reject this RMA at: http://localhost:5173/admin/rmas

Thank you,
RMAinator System
"""
    
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=admin_emails,
            fail_silently=False,
        )
        return True
    except Exception as e:
        print(f"Failed to send new RMA notification to admins: {e}")
        return False


def send_new_user_notification_to_admins(user):
    """
    Send email to admins when a new user registers.
    
    Args:
        user: User instance
    """
    admin_emails = get_admin_emails()
    if not admin_emails:
        return False
    
    subject = f'New User Registration: {user.username}'
    
    message = f"""
A new user has registered and requires approval.

Username: {user.username}
Email: {user.email}
Registration Date: {user.date_joined.strftime('%Y-%m-%d %H:%M:%S')}

Please review and approve/reject this user at: http://localhost:5173/admin/users

Thank you,
RMAinator System
"""
    
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=admin_emails,
            fail_silently=False,
        )
        return True
    except Exception as e:
        print(f"Failed to send new user notification to admins: {e}")
        return False


def send_rma_rejection_email(rma):
    """
    Send email to RMA owner when RMA is rejected.
    
    Args:
        rma: RMA instance
    """
    subject = f'RMA #{rma.rma_number} Rejected'
    
    message = f"""
Hello {rma.owner.username},

Unfortunately, your RMA request #{rma.rma_number} has been rejected.

Device: {rma.serial_number}
Reason: {rma.rejection_reason if rma.rejection_reason else 'No reason provided'}

If you have questions, please contact support.

Thank you,
RMAinator Team
"""
    
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[rma.owner.email],
            fail_silently=False,
        )
        return True
    except Exception as e:
        print(f"Failed to send RMA rejection email: {e}")
        return False


def send_rma_completed_email(rma):
    """
    Send email to RMA owner when RMA is completed.
    
    Args:
        rma: RMA instance
    """
    subject = f'RMA #{rma.rma_number} Completed'
    
    message = f"""
Hello {rma.owner.username},

Great news! Your RMA #{rma.rma_number} has been completed.

Device: {rma.serial_number}
Return Date: {rma.return_date.strftime('%Y-%m-%d') if rma.return_date else 'Not set'}

You can view the complete details at: http://localhost:5173/rma/{rma.id}

Thank you for your patience,
RMAinator Team
"""
    
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[rma.owner.email],
            fail_silently=False,
        )
        return True
    except Exception as e:
        print(f"Failed to send RMA completed email: {e}")
        return False


def send_user_approved_email(user):
    """
    Send email to user when their account is approved.
    
    Args:
        user: User instance
    """
    subject = 'Your RMAinator Account Has Been Approved'
    
    message = f"""
Hello {user.username},

Your RMAinator account has been approved! You can now submit RMA requests.

Login at: http://localhost:5173/login

Thank you,
RMAinator Team
"""
    
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )
        return True
    except Exception as e:
        print(f"Failed to send user approved email: {e}")
        return False


def send_stale_rma_notification_to_admins(rma, time_in_state, timeout_config):
    """
    Send email to admins when an RMA becomes stale.
    
    Args:
        rma: RMA instance
        time_in_state: timedelta of how long RMA has been in current state
        timeout_config: StateTimeout instance with threshold info
    """
    admin_emails = get_admin_emails()
    if not admin_emails:
        return False
    
    hours_in_state = time_in_state.total_seconds() / 3600
    subject = f'STALE RMA ALERT: #{rma.rma_number} - {rma.state}'
    
    message = f"""
STALE RMA ALERT

An RMA has exceeded the timeout threshold for its current state.

RMA Number: #{rma.rma_number}
Serial Number: {rma.serial_number}
Owner: {rma.owner.username} ({rma.owner.email})
Current State: {rma.state}
Priority: {rma.priority}

Time in Current State: {hours_in_state:.1f} hours
Configured Threshold: {timeout_config.timeout_hours} hours
Overdue by: {hours_in_state - timeout_config.timeout_hours:.1f} hours

Please review and take action: http://localhost:5173/admin/rmas

Thank you,
RMAinator System
"""
    
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=admin_emails,
            fail_silently=False,
        )
        return True
    except Exception as e:
        print(f"Failed to send stale RMA notification to admins: {e}")
        return False


def check_stale_rmas(send_email=True):
    """
    Check for stale RMAs and optionally send notifications.
    
    Args:
        send_email: Whether to send email notifications (default: True)
    
    Returns:
        List of dicts containing stale RMA info: [{'rma': RMA, 'time_in_state': timedelta, 'timeout': StateTimeout}]
    """
    from django.utils import timezone
    from datetime import timedelta
    from rma.models import RMA
    from notifications.models import StateTimeout, StaleRMARecord
    
    timeouts = StateTimeout.objects.all()
    if not timeouts.exists():
        return []
    
    stale_rmas = []
    
    # Check active RMAs
    active_rmas = RMA.objects.exclude(
        state__in=[RMA.State.COMPLETED, RMA.State.REJECTED]
    ).select_related('owner')
    
    for rma in active_rmas:
        # Use updated_at as a simple proxy for time in state
        # In production, you'd use state_history
        try:
            timeout_config = timeouts.get(
                state=rma.state,
                priority=rma.priority
            )
        except StateTimeout.DoesNotExist:
            continue
        
        time_in_state = timezone.now() - rma.updated_at
        timeout_threshold = timedelta(hours=timeout_config.timeout_hours)
        
        if time_in_state > timeout_threshold:
            stale_rmas.append({
                'rma': rma,
                'time_in_state': time_in_state,
                'timeout': timeout_config
            })
            
            # Create stale record if not exists
            StaleRMARecord.objects.get_or_create(
                rma=rma,
                state=rma.state,
                resolved=False,
                defaults={'notification_sent': send_email}
            )
            
            # Send email if requested
            if send_email:
                send_stale_rma_notification_to_admins(rma, time_in_state, timeout_config)
    
    return stale_rmas
