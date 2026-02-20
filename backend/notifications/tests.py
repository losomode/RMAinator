from django.test import TestCase
from django.core import mail
from django.utils import timezone
from datetime import timedelta
from users.models import User
from rma.models import RMA, RMAStateHistory
from notifications.models import StateTimeout, StaleRMARecord
from notifications.utils import check_stale_rmas


class EmailNotificationTests(TestCase):
    """Test email notification functionality."""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='user@example.com',
            password='testpass123',
            role='USER',
            is_verified=True
        )
        self.admin = User.objects.create_user(
            username='admin',
            email='admin@example.com',
            password='adminpass123',
            role='ADMIN',
            is_verified=True
        )
    
    def test_new_user_registration_email_to_admin(self):
        """Test that admin receives email when new user registers."""
        # Clear any existing emails
        mail.outbox = []
        
        # Create new user
        User.objects.create_user(
            username='newuser',
            email='new@example.com',
            password='pass123',
            role='USER'
        )
        
        # Check that email was sent
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('admin@example.com', mail.outbox[0].to)
        self.assertIn('New User Registration', mail.outbox[0].subject)
    
    def test_new_rma_submission_email_to_admin(self):
        """Test that admin receives email when new RMA is submitted."""
        mail.outbox = []
        
        RMA.objects.create(
            serial_number='SN123',
            priority='HIGH',
            fault_notes='Critical issue',
            owner=self.user
        )
        
        # Check that email was sent to admin
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('admin@example.com', mail.outbox[0].to)
        self.assertIn('New RMA Submitted', mail.outbox[0].subject)
    
    def test_rma_state_change_email_to_user(self):
        """Test that user receives email when RMA state changes."""
        rma = RMA.objects.create(
            serial_number='SN123',
            priority='NORMAL',
            fault_notes='Test issue',
            owner=self.user
        )
        
        mail.outbox = []
        
        # Change RMA state
        rma._changed_by = self.admin
        rma.state = 'APPROVED'
        rma.save()
        
        # Check that email was sent to user
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('user@example.com', mail.outbox[0].to)
        self.assertIn('Status Update', mail.outbox[0].subject)
    
    def test_user_approval_email(self):
        """Test that user receives email when account is approved."""
        unverified_user = User.objects.create_user(
            username='unverified',
            email='unverified@example.com',
            password='pass123',
            role='USER',
            is_verified=False
        )
        
        mail.outbox = []
        
        # Approve user - mark with _just_verified flag
        unverified_user._just_verified = True
        unverified_user.is_verified = True
        unverified_user.save()
        
        # Check that email was sent
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('unverified@example.com', mail.outbox[0].to)
        self.assertIn('Account', mail.outbox[0].subject)


class StaleRMADetectionTests(TestCase):
    """Test stale RMA detection functionality."""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='user@example.com',
            password='testpass123',
            role='USER',
            is_verified=True
        )
        self.admin = User.objects.create_user(
            username='admin',
            email='admin@example.com',
            password='adminpass123',
            role='ADMIN',
            is_verified=True
        )
        
        # Create state timeouts for testing
        StateTimeout.objects.create(
            state='SUBMITTED',
            priority='HIGH',
            timeout_hours=24
        )
        StateTimeout.objects.create(
            state='SUBMITTED',
            priority='NORMAL',
            timeout_hours=48
        )
    
    def test_detect_stale_rma(self):
        """Test detection of stale RMAs."""
        # Create an RMA that's been in SUBMITTED state for more than 24 hours
        old_rma = RMA.objects.create(
            serial_number='SN123',
            priority='HIGH',
            fault_notes='Old issue',
            owner=self.user,
            state='SUBMITTED'
        )
        
        # Manually set updated_at to simulate old RMA using update() to bypass auto_now
        RMA.objects.filter(id=old_rma.id).update(
            updated_at=timezone.now() - timedelta(hours=25)
        )
        
        # Run stale check
        stale_rmas = check_stale_rmas(send_email=False)
        
        # Should detect the stale RMA
        self.assertEqual(len(stale_rmas), 1)
        self.assertEqual(stale_rmas[0]['rma'].id, old_rma.id)
    
    def test_stale_rma_record_created(self):
        """Test that StaleRMARecord is created for stale RMAs."""
        old_rma = RMA.objects.create(
            serial_number='SN456',
            priority='NORMAL',
            fault_notes='Test',
            owner=self.user,
            state='SUBMITTED'
        )
        
        RMA.objects.filter(id=old_rma.id).update(
            updated_at=timezone.now() - timedelta(hours=50)
        )
        
        # Run stale check
        check_stale_rmas(send_email=False)
        
        # Check that StaleRMARecord was created
        self.assertTrue(StaleRMARecord.objects.filter(rma=old_rma).exists())
    
    def test_fresh_rma_not_detected(self):
        """Test that recent RMAs are not detected as stale."""
        fresh_rma = RMA.objects.create(
            serial_number='SN789',
            priority='HIGH',
            fault_notes='Fresh issue',
            owner=self.user,
            state='SUBMITTED'
        )
        
        # Run stale check
        stale_rmas = check_stale_rmas(send_email=False)
        
        # Should not detect fresh RMA
        stale_ids = [s['rma'].id for s in stale_rmas]
        self.assertNotIn(fresh_rma.id, stale_ids)
    
    def test_completed_rma_not_checked(self):
        """Test that completed/rejected RMAs are not checked for staleness."""
        completed_rma = RMA.objects.create(
            serial_number='SN999',
            priority='HIGH',
            fault_notes='Completed',
            owner=self.user,
            state='COMPLETED'
        )
        
        RMA.objects.filter(id=completed_rma.id).update(
            updated_at=timezone.now() - timedelta(hours=100)
        )
        
        # Run stale check
        stale_rmas = check_stale_rmas(send_email=False)
        
        # Should not detect completed RMA
        stale_ids = [s['rma'].id for s in stale_rmas]
        self.assertNotIn(completed_rma.id, stale_ids)


class StateTimeoutModelTests(TestCase):
    """Test StateTimeout model functionality."""
    
    def test_create_state_timeout(self):
        """Test creating state timeout configuration."""
        timeout = StateTimeout.objects.create(
            state='RECEIVED',
            priority='HIGH',
            timeout_hours=12
        )
        
        self.assertEqual(timeout.state, 'RECEIVED')
        self.assertEqual(timeout.priority, 'HIGH')
        self.assertEqual(timeout.timeout_hours, 12)
    
    def test_unique_state_priority_combination(self):
        """Test that state/priority combinations are unique."""
        StateTimeout.objects.create(
            state='DIAGNOSED',
            priority='NORMAL',
            timeout_hours=24
        )
        
        # Trying to create duplicate should raise error
        with self.assertRaises(Exception):
            StateTimeout.objects.create(
                state='DIAGNOSED',
                priority='NORMAL',
                timeout_hours=48
            )
