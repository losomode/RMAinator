"""
Tests for RMA models.
"""
from django.test import TestCase
from django.utils import timezone
from datetime import date, timedelta
from rma.models import RMA, RMAGroup, RMAStateHistory, RMAAttachment
from core.test_utils import create_mock_user, create_mock_admin


class RMAModelTest(TestCase):
    """Test RMA model functionality."""
    
    def setUp(self):
        """Set up test data."""
        self.user = create_mock_user(user_id=1, username='testuser')
        self.admin = create_mock_admin(user_id=2, username='admin')
        
        self.rma = RMA.objects.create(
            serial_number='SN12345',
            owner=self.user,
            fault_notes='Device not working',
            priority=RMA.Priority.NORMAL,
            state=RMA.State.SUBMITTED
        )
    
    def test_rma_creation(self):
        """Test RMA is created with correct defaults."""
        self.assertIsNotNone(self.rma.rma_number)
        self.assertIsInstance(self.rma.rma_number, int)
        self.assertGreater(self.rma.rma_number, 0)
        self.assertEqual(self.rma.state, RMA.State.SUBMITTED)
        self.assertEqual(self.rma.owner, self.user)
    
    def test_rma_number_unique(self):
        """Test RMA numbers are unique."""
        rma2 = RMA.objects.create(
            serial_number='SN67890',
            owner=self.user,
            fault_notes='Another issue'
        )
        self.assertNotEqual(self.rma.rma_number, rma2.rma_number)
    
    def test_years_in_field(self):
        """Test years_in_field calculation."""
        # No ship date or received date
        self.assertIsNone(self.rma.years_in_field)
        
        # Ship date 2 years ago and set received date
        self.rma.first_ship_date = date.today() - timedelta(days=730)
        self.rma.rma_received_date = date.today()
        self.rma.save()
        self.assertEqual(self.rma.years_in_field, 2.0)
    
    def test_is_archived(self):
        """Test is_archived property."""
        # Not archived states
        self.assertFalse(self.rma.is_archived)
        
        self.rma.state = RMA.State.APPROVED
        self.assertFalse(self.rma.is_archived)
        
        # Archived states
        self.rma.state = RMA.State.COMPLETED
        self.assertTrue(self.rma.is_archived)
        
        self.rma.state = RMA.State.REJECTED
        self.assertTrue(self.rma.is_archived)
    
    def test_state_transition_creates_history(self):
        """Test that state changes create history entries."""
        initial_count = RMAStateHistory.objects.filter(rma=self.rma).count()
        
        # Change state
        self.rma._changed_by = self.admin
        self.rma.state = RMA.State.APPROVED
        self.rma.save()
        
        # Check history was created
        self.assertEqual(
            RMAStateHistory.objects.filter(rma=self.rma).count(),
            initial_count + 1
        )
        
        history = RMAStateHistory.objects.filter(rma=self.rma).first()
        self.assertEqual(history.from_state, RMA.State.SUBMITTED)
        self.assertEqual(history.to_state, RMA.State.APPROVED)
        self.assertEqual(history.changed_by, self.admin)
    
    def test_string_representation(self):
        """Test __str__ method."""
        # The actual __str__ method includes "RMA #" prefix
        expected = f"RMA #{self.rma.rma_number} - SN: {self.rma.serial_number}"
        self.assertEqual(str(self.rma), expected)


class RMAGroupModelTest(TestCase):
    """Test RMA group functionality."""
    
    def setUp(self):
        """Set up test data."""
        self.user = create_mock_user(user_id=1)
        self.group = RMAGroup.objects.create(created_by=self.user)
    
    def test_group_creation(self):
        """Test group is created correctly."""
        self.assertEqual(self.group.created_by, self.user)
        self.assertIsNotNone(self.group.created_at)
    
    def test_group_with_rmas(self):
        """Test group with multiple RMAs."""
        rma1 = RMA.objects.create(
            serial_number='SN1',
            owner=self.user,
            group=self.group
        )
        rma2 = RMA.objects.create(
            serial_number='SN2',
            owner=self.user,
            group=self.group
        )
        
        # Access related RMAs
        self.assertEqual(self.group.rmas.count(), 2)
        self.assertIn(rma1, self.group.rmas.all())
        self.assertIn(rma2, self.group.rmas.all())


class RMAStateHistoryModelTest(TestCase):
    """Test RMA state history."""
    
    def setUp(self):
        """Set up test data."""
        self.user = create_mock_user(user_id=1)
        self.admin = create_mock_admin(user_id=2)
        
        self.rma = RMA.objects.create(
            serial_number='SN12345',
            owner=self.user
        )
    
    def test_state_history_creation(self):
        """Test creating state history entry."""
        history = RMAStateHistory.objects.create(
            rma=self.rma,
            from_state=RMA.State.SUBMITTED,
            to_state=RMA.State.APPROVED,
            changed_by=self.admin,
            notes='Looks good'
        )
        
        self.assertEqual(history.rma, self.rma)
        self.assertEqual(history.from_state, RMA.State.SUBMITTED)
        self.assertEqual(history.to_state, RMA.State.APPROVED)
        self.assertEqual(history.changed_by, self.admin)
        self.assertEqual(history.notes, 'Looks good')
    
    def test_state_history_ordering(self):
        """Test state history is ordered by newest first."""
        # Create multiple history entries
        history1 = RMAStateHistory.objects.create(
            rma=self.rma,
            from_state=RMA.State.SUBMITTED,
            to_state=RMA.State.APPROVED,
            changed_by=self.admin
        )
        
        history2 = RMAStateHistory.objects.create(
            rma=self.rma,
            from_state=RMA.State.APPROVED,
            to_state=RMA.State.RECEIVED,
            changed_by=self.admin
        )
        
        # Should be ordered newest first
        histories = list(self.rma.state_history.all())
        self.assertEqual(histories[0], history2)
        self.assertEqual(histories[1], history1)


class RMAAttachmentModelTest(TestCase):
    """Test RMA attachments."""
    
    def setUp(self):
        """Set up test data."""
        self.user = create_mock_user(user_id=1)
        self.rma = RMA.objects.create(
            serial_number='SN12345',
            owner=self.user
        )
    
    def test_attachment_creation(self):
        """Test creating an attachment."""
        attachment = RMAAttachment.objects.create(
            rma=self.rma,
            filename='test.pdf',
            uploaded_by=self.user,
            file_size=1024
        )
        
        self.assertEqual(attachment.rma, self.rma)
        self.assertEqual(attachment.filename, 'test.pdf')
        self.assertEqual(attachment.uploaded_by, self.user)
        self.assertEqual(attachment.file_size, 1024)
        self.assertIsNotNone(attachment.uploaded_at)
    
    def test_multiple_attachments_per_rma(self):
        """Test RMA can have multiple attachments."""
        att1 = RMAAttachment.objects.create(
            rma=self.rma,
            filename='file1.pdf',
            uploaded_by=self.user,
            file_size=1024
        )
        att2 = RMAAttachment.objects.create(
            rma=self.rma,
            filename='file2.jpg',
            uploaded_by=self.user,
            file_size=2048
        )
        
        self.assertEqual(self.rma.attachments.count(), 2)
        self.assertIn(att1, self.rma.attachments.all())
        self.assertIn(att2, self.rma.attachments.all())
