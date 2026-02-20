from django.test import TestCase
from django.contrib.contenttypes.models import ContentType
from rest_framework.test import APIClient
from users.models import User
from rma.models import RMA
from audit.models import AuditLog


class AuditLogCreationTests(TestCase):
    """Test audit log creation functionality."""
    
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
    
    def test_audit_log_created_on_rma_update(self):
        """Test that audit logs are created when RMA fields are updated."""
        rma = RMA.objects.create(
            serial_number='SN123',
            priority='NORMAL',
            fault_notes='Test issue',
            owner=self.user
        )
        
        # Update RMA field
        rma._changed_by = self.admin
        rma.fault_notes = 'Updated issue description'
        rma.save()
        
        # Check audit log was created
        content_type = ContentType.objects.get_for_model(RMA)
        audit_logs = AuditLog.objects.filter(
            content_type=content_type,
            object_id=rma.id,
            field_name='fault_notes'
        )
        
        self.assertTrue(audit_logs.exists())
        log = audit_logs.first()
        self.assertEqual(log.old_value, 'Test issue')
        self.assertEqual(log.new_value, 'Updated issue description')
        self.assertEqual(log.user, self.admin)
    
    def test_audit_log_multiple_field_updates(self):
        """Test audit logs for multiple field changes."""
        rma = RMA.objects.create(
            serial_number='SN456',
            priority='LOW',
            fault_notes='Original',
            owner=self.user
        )
        
        # Update multiple fields
        rma._changed_by = self.admin
        rma.priority = 'HIGH'
        rma.fault_notes = 'Updated'
        rma.save()
        
        # Check audit logs were created for both fields
        content_type = ContentType.objects.get_for_model(RMA)
        audit_logs = AuditLog.objects.filter(
            content_type=content_type,
            object_id=rma.id
        )
        
        # Should have at least the logs for our two fields
        self.assertGreaterEqual(audit_logs.count(), 2)
        field_names = set(audit_logs.values_list('field_name', flat=True))
        self.assertIn('priority', field_names)
        self.assertIn('fault_notes', field_names)
    
    def test_audit_log_state_change(self):
        """Test audit log for state changes."""
        rma = RMA.objects.create(
            serial_number='SN789',
            priority='NORMAL',
            fault_notes='Test',
            owner=self.user,
            state='SUBMITTED'
        )
        
        # Change state
        rma._changed_by = self.admin
        rma.state = 'APPROVED'
        rma.save()
        
        # Check audit log
        content_type = ContentType.objects.get_for_model(RMA)
        audit_log = AuditLog.objects.filter(
            content_type=content_type,
            object_id=rma.id,
            field_name='state'
        ).first()
        
        self.assertIsNotNone(audit_log)
        self.assertEqual(audit_log.old_value, 'SUBMITTED')
        self.assertEqual(audit_log.new_value, 'APPROVED')


class AuditLogAPITests(TestCase):
    """Test audit log API endpoints."""
    
    def setUp(self):
        self.client = APIClient()
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
        
        self.rma = RMA.objects.create(
            serial_number='SN123',
            priority='NORMAL',
            fault_notes='Test issue',
            owner=self.user
        )
    
    def test_user_can_view_audit_history_own_rma(self):
        """Test user can view audit history for their own RMA."""
        # Create audit log
        content_type = ContentType.objects.get_for_model(RMA)
        AuditLog.objects.create(
            content_type=content_type,
            object_id=self.rma.id,
            field_name='fault_notes',
            old_value='Old',
            new_value='New',
            user=self.admin
        )
        
        self.client.force_authenticate(user=self.user)
        response = self.client.get(f'/api/rma/{self.rma.id}/audit/')
        
        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(len(response.data['results']), 1)
    
    def test_user_cannot_view_audit_history_other_rma(self):
        """Test user cannot view audit history for another user's RMA."""
        other_user = User.objects.create_user(
            username='other',
            email='other@example.com',
            password='pass123',
            role='USER',
            is_verified=True
        )
        
        self.client.force_authenticate(user=other_user)
        response = self.client.get(f'/api/rma/{self.rma.id}/audit/')
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data['results']), 0)
    
    def test_admin_can_view_all_audit_history(self):
        """Test admin can view audit history for any RMA."""
        content_type = ContentType.objects.get_for_model(RMA)
        AuditLog.objects.create(
            content_type=content_type,
            object_id=self.rma.id,
            field_name='priority',
            old_value='LOW',
            new_value='HIGH',
            user=self.admin
        )
        
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(f'/api/rma/{self.rma.id}/audit/')
        
        self.assertEqual(response.status_code, 200)
        self.assertTrue(len(response.data['results']) > 0)
