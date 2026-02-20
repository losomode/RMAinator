from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from notifications.utils import (
    send_new_user_notification_to_admins,
    send_user_approved_email,
)

User = get_user_model()


@receiver(post_save, sender=User)
def user_post_save_handler(sender, instance, created, **kwargs):
    """Handle user creation and updates."""
    if created:
        # New user registered - notify admins
        send_new_user_notification_to_admins(instance)
    else:
        # Check if user was just verified (approved)
        if hasattr(instance, '_just_verified') and instance._just_verified:
            send_user_approved_email(instance)
