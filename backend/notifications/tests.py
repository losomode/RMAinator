"""
Tests for notification utilities.
"""
from django.test import TestCase
from django.core import mail
from rma.models import RMA
from notifications.utils import (
    get_admin_emails,
    send_rma_state_change_email,
    send_new_rma_notification_to_admins,
    send_rma_rejection_email,
    send_rma_completed_email
)
from core.test_utils import create_mock_user, create_mock_admin


class NotificationUtilsTest(TestCase):
    """Test notification utility functions."""
    
    def setUp(self):
        """Set up test data."""
        self.user = create_mock_user()
        self.admin = create_mock_admin()
        
        self.rma = RMA.objects.create(
            serial_number='SN123',
            owner=self.user,
            fault_notes='Test issue',
            state=RMA.State.SUBMITTED
        )
        
        # Clear any emails sent by signals during setup
        mail.outbox = []
    
    def test_get_admin_emails(self):
        """Test getting admin email addresses."""
        emails = get_admin_emails()
        
        self.assertIsInstance(emails, list)
        # Should include our admin user
        self.assertIn(self.admin.email, emails)
        # Should not include regular user
        self.assertNotIn(self.user.email, emails)
    
    def test_get_admin_emails_empty(self):
        """Test getting admin emails when no admins exist."""
        # Remove all admins
        from users.models import User
        User.objects.filter(is_staff=True).update(is_staff=False)
        
        emails = get_admin_emails()
        self.assertEqual(emails, [])
    
    def test_send_rma_state_change_email(self):
        """Test sending RMA state change notification."""
        mail.outbox = []  # Clear mailbox
        
        result = send_rma_state_change_email(
            self.rma,
            old_state=RMA.State.SUBMITTED,
            new_state=RMA.State.APPROVED
        )
        
        self.assertTrue(result)
        
        # Check that email was sent
        self.assertEqual(len(mail.outbox), 1)
        email = mail.outbox[0]
        
        # Check email details
        self.assertIn(str(self.rma.rma_number), email.subject)
        self.assertIn('APPROVED', email.subject)
        self.assertIn(self.rma.serial_number, email.body)
        self.assertEqual(email.to, [self.user.email])
    
    def test_send_new_rma_notification_to_admins(self):
        """Test sending new RMA notification to admins."""
        mail.outbox = []  # Clear mailbox
        
        result = send_new_rma_notification_to_admins(self.rma)
        
        self.assertTrue(result)
        
        # Check that email was sent
        self.assertEqual(len(mail.outbox), 1)
        email = mail.outbox[0]
        
        # Check email details
        self.assertIn(str(self.rma.rma_number), email.subject)
        self.assertIn(self.rma.serial_number, email.body)
        self.assertIn(self.admin.email, email.to)
    
    def test_send_new_rma_notification_no_admins(self):
        """Test sending notification when no admins exist."""
        mail.outbox = []  # Clear mailbox
        
        # Remove all admins
        from users.models import User
        User.objects.filter(is_staff=True).update(is_staff=False)
        
        result = send_new_rma_notification_to_admins(self.rma)
        
        self.assertFalse(result)
        self.assertEqual(len(mail.outbox), 0)
    
    def test_send_rma_rejection_email(self):
        """Test sending RMA rejection notification."""
        mail.outbox = []  # Clear mailbox
        
        self.rma.rejection_reason = 'Out of warranty'
        
        result = send_rma_rejection_email(self.rma)
        
        self.assertTrue(result)
        
        # Check that email was sent
        self.assertEqual(len(mail.outbox), 1)
        email = mail.outbox[0]
        
        # Check email details
        self.assertIn(str(self.rma.rma_number), email.subject)
        self.assertIn('Rejected', email.subject)
        self.assertIn('Out of warranty', email.body)
        self.assertEqual(email.to, [self.user.email])
    
    def test_send_rma_rejection_email_no_reason(self):
        """Test sending rejection email without reason."""
        mail.outbox = []  # Clear mailbox
        
        self.rma.rejection_reason = ''
        
        result = send_rma_rejection_email(self.rma)
        
        self.assertTrue(result)
        self.assertEqual(len(mail.outbox), 1)
        email = mail.outbox[0]
        self.assertIn('No reason provided', email.body)
    
    def test_send_rma_completed_email(self):
        """Test sending RMA completed notification."""
        from datetime import date
        
        mail.outbox = []  # Clear mailbox
        
        self.rma.return_date = date.today()
        
        result = send_rma_completed_email(self.rma)
        
        self.assertTrue(result)
        
        # Check that email was sent
        self.assertEqual(len(mail.outbox), 1)
        email = mail.outbox[0]
        
        # Check email details
        self.assertIn(str(self.rma.rma_number), email.subject)
        self.assertIn('Completed', email.subject)
        self.assertIn(self.rma.serial_number, email.body)
        self.assertEqual(email.to, [self.user.email])
    
    def test_send_rma_completed_email_no_return_date(self):
        """Test sending completed email without return date."""
        mail.outbox = []  # Clear mailbox
        
        self.rma.return_date = None
        
        result = send_rma_completed_email(self.rma)
        
        self.assertTrue(result)
        self.assertEqual(len(mail.outbox), 1)
        email = mail.outbox[0]
        self.assertIn('Not set', email.body)
    
    def test_send_new_user_notification_to_admins(self):
        """Test sending new user notification to admins."""
        from notifications.utils import send_new_user_notification_to_admins
        
        mail.outbox = []  # Clear mailbox
        
        result = send_new_user_notification_to_admins(self.user)
        
        self.assertTrue(result)
        self.assertEqual(len(mail.outbox), 1)
        email = mail.outbox[0]
        
        self.assertIn(self.user.username, email.subject)
        self.assertIn(self.user.email, email.body)
        self.assertIn(self.admin.email, email.to)
    
    def test_send_new_user_notification_no_admins(self):
        """Test sending user notification when no admins exist."""
        from notifications.utils import send_new_user_notification_to_admins
        from users.models import User
        
        mail.outbox = []  # Clear mailbox
        User.objects.filter(is_staff=True).update(is_staff=False)
        
        result = send_new_user_notification_to_admins(self.user)
        
        self.assertFalse(result)
        self.assertEqual(len(mail.outbox), 0)
    
    def test_send_user_approved_email(self):
        """Test sending user approved notification."""
        from notifications.utils import send_user_approved_email
        
        mail.outbox = []  # Clear mailbox
        
        result = send_user_approved_email(self.user)
        
        self.assertTrue(result)
        self.assertEqual(len(mail.outbox), 1)
        email = mail.outbox[0]
        
        self.assertIn('Approved', email.subject)
        self.assertIn(self.user.username, email.body)
        self.assertEqual(email.to, [self.user.email])
    
    def test_send_stale_rma_notification_to_admins(self):
        """Test sending stale RMA notification to admins."""
        from notifications.utils import send_stale_rma_notification_to_admins
        from notifications.models import StateTimeout
        from datetime import timedelta
        
        mail.outbox = []  # Clear mailbox
        
        timeout = StateTimeout.objects.create(
            state=RMA.State.APPROVED,
            priority=RMA.Priority.NORMAL,
            timeout_hours=48
        )
        
        time_in_state = timedelta(hours=60)
        
        result = send_stale_rma_notification_to_admins(self.rma, time_in_state, timeout)
        
        self.assertTrue(result)
        self.assertEqual(len(mail.outbox), 1)
        email = mail.outbox[0]
        
        self.assertIn('STALE', email.subject)
        self.assertIn(str(self.rma.rma_number), email.subject)
        self.assertIn('60.0 hours', email.body)
        self.assertIn(self.admin.email, email.to)
    
    def test_send_stale_rma_notification_no_admins(self):
        """Test sending stale notification when no admins exist."""
        from notifications.utils import send_stale_rma_notification_to_admins
        from notifications.models import StateTimeout
        from users.models import User
        from datetime import timedelta
        
        mail.outbox = []  # Clear mailbox
        User.objects.filter(is_staff=True).update(is_staff=False)
        
        timeout = StateTimeout.objects.create(
            state=RMA.State.APPROVED,
            priority=RMA.Priority.NORMAL,
            timeout_hours=48
        )
        time_in_state = timedelta(hours=60)
        
        result = send_stale_rma_notification_to_admins(self.rma, time_in_state, timeout)
        
        self.assertFalse(result)
        self.assertEqual(len(mail.outbox), 0)
    
    def test_check_stale_rmas_no_timeouts(self):
        """Test check_stale_rmas with no timeout configs."""
        from notifications.utils import check_stale_rmas
        
        result = check_stale_rmas(send_email=False)
        
        self.assertEqual(result, [])
    
    def test_check_stale_rmas_with_stale_rma(self):
        """Test check_stale_rmas identifies stale RMAs."""
        from notifications.utils import check_stale_rmas
        from notifications.models import StateTimeout
        from django.utils import timezone
        from datetime import timedelta
        
        # Create timeout config
        StateTimeout.objects.create(
            state=RMA.State.SUBMITTED,
            priority=RMA.Priority.NORMAL,
            timeout_hours=1
        )
        
        # Make RMA appear stale by backdating updated_at using update() to avoid auto_now
        RMA.objects.filter(pk=self.rma.pk).update(
            updated_at=timezone.now() - timedelta(hours=2)
        )
        # Refresh the instance
        self.rma.refresh_from_db()
        
        mail.outbox = []  # Clear mailbox
        result = check_stale_rmas(send_email=True)
        
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]['rma'], self.rma)
        self.assertTrue(result[0]['time_in_state'] > timedelta(hours=1))
        
        # Should send email
        self.assertEqual(len(mail.outbox), 1)
    
    def test_check_stale_rmas_no_email(self):
        """Test check_stale_rmas without sending email."""
        from notifications.utils import check_stale_rmas
        from notifications.models import StateTimeout
        from django.utils import timezone
        from datetime import timedelta
        
        StateTimeout.objects.create(
            state=RMA.State.SUBMITTED,
            priority=RMA.Priority.NORMAL,
            timeout_hours=1
        )
        
        # Use update() to bypass auto_now
        RMA.objects.filter(pk=self.rma.pk).update(
            updated_at=timezone.now() - timedelta(hours=2)
        )
        self.rma.refresh_from_db()
        
        mail.outbox = []  # Clear mailbox
        result = check_stale_rmas(send_email=False)
        
        self.assertEqual(len(result), 1)
        # Should not send email
        self.assertEqual(len(mail.outbox), 0)
    
    def test_check_stale_rmas_excludes_completed(self):
        """Test check_stale_rmas excludes completed/rejected RMAs."""
        from notifications.utils import check_stale_rmas
        from notifications.models import StateTimeout
        from django.utils import timezone
        from datetime import timedelta
        
        StateTimeout.objects.create(
            state=RMA.State.COMPLETED,
            priority=RMA.Priority.NORMAL,
            timeout_hours=1
        )
        
        # Make RMA completed and stale using update() to bypass auto_now
        RMA.objects.filter(pk=self.rma.pk).update(
            state=RMA.State.COMPLETED,
            updated_at=timezone.now() - timedelta(hours=2)
        )
        self.rma.refresh_from_db()
        
        result = check_stale_rmas(send_email=False)
        
        # Should not identify completed RMA as stale
        self.assertEqual(len(result), 0)
