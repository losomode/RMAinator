from django.test import TestCase
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from rest_framework import status
from users.models import User
from rma.models import RMA, RMAGroup, RMAStateHistory, RMAAttachment
from datetime import date, timedelta
from django.utils import timezone


class RMACreationTests(TestCase):
    """Test RMA creation functionality."""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
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
    
    def test_create_single_rma_success(self):
        """Test creating a single RMA."""
        self.client.force_authenticate(user=self.user)
        
        data = {
            'serial_number': 'SN123456',
            'priority': 'NORMAL',
            'fault_notes': 'Device not working',
            'first_ship_date': '2024-01-15'
        }
        
        response = self.client.post('/api/rma/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(RMA.objects.count(), 1)
        
        rma = RMA.objects.first()
        self.assertEqual(rma.serial_number, 'SN123456')
        self.assertEqual(rma.state, 'SUBMITTED')
        self.assertEqual(rma.owner, self.user)
        self.assertIsNotNone(rma.rma_number)
    
    def test_create_rma_unauthenticated(self):
        """Test creating RMA without authentication fails."""
        data = {
            'serial_number': 'SN123456',
            'priority': 'NORMAL',
            'fault_notes': 'Device not working'
        }
        
        response = self.client.post('/api/rma/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_create_rma_missing_required_fields(self):
        """Test creating RMA with missing required fields fails."""
        self.client.force_authenticate(user=self.user)
        
        data = {
            'priority': 'NORMAL'
            # Missing serial_number and fault_notes
        }
        
        response = self.client.post('/api/rma/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class RMAGroupTests(TestCase):
    """Test RMA group functionality."""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            role='USER',
            is_verified=True
        )
    
    def test_create_rma_group(self):
        """Test creating multiple RMAs as a group."""
        self.client.force_authenticate(user=self.user)
        
        data = {
            'rmas': [
                {
                    'serial_number': 'SN001',
                    'priority': 'NORMAL',
                    'fault_notes': 'Device 1 issue',
                    'first_ship_date': '2024-01-15'
                },
                {
                    'serial_number': 'SN002',
                    'priority': 'NORMAL',
                    'fault_notes': 'Device 2 issue',
                    'first_ship_date': '2024-01-16'
                },
                {
                    'serial_number': 'SN003',
                    'priority': 'HIGH',
                    'fault_notes': 'Device 3 issue',
                    'first_ship_date': '2024-01-17'
                }
            ]
        }
        
        response = self.client.post('/api/rma/group/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(RMA.objects.count(), 3)
        self.assertEqual(RMAGroup.objects.count(), 1)
        
        group = RMAGroup.objects.first()
        self.assertEqual(group.device_count, 3)
        self.assertEqual(group.owner, self.user)
        
        # All RMAs should have the same group
        rmas = RMA.objects.all()
        for rma in rmas:
            self.assertEqual(rma.group, group)


class RMAStateTransitionTests(TestCase):
    """Test RMA state transition logic and permissions."""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
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
            serial_number='SN123456',
            priority='NORMAL',
            fault_notes='Test issue',
            state='SUBMITTED',
            owner=self.user
        )
    
    def test_admin_can_approve_rma(self):
        """Test admin can approve submitted RMA."""
        self.client.force_authenticate(user=self.admin)
        
        data = {'state': 'APPROVED', 'notes': 'Approved for processing'}
        response = self.client.post(f'/api/rma/{self.rma.id}/state/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.rma.refresh_from_db()
        self.assertEqual(self.rma.state, 'APPROVED')
        
        # Check state history was created
        history = RMAStateHistory.objects.filter(rma=self.rma).first()
        self.assertIsNotNone(history)
        self.assertEqual(history.to_state, 'APPROVED')
        self.assertEqual(history.changed_by, self.admin)
    
    def test_admin_can_reject_rma(self):
        """Test admin can reject RMA."""
        self.client.force_authenticate(user=self.admin)
        
        data = {'state': 'REJECTED', 'notes': 'Out of warranty'}
        response = self.client.post(f'/api/rma/{self.rma.id}/state/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.rma.refresh_from_db()
        self.assertEqual(self.rma.state, 'REJECTED')


class RMAPermissionTests(TestCase):
    """Test RMA access permissions."""
    
    def setUp(self):
        self.client = APIClient()
        self.user1 = User.objects.create_user(
            username='user1',
            email='user1@example.com',
            password='pass123',
            role='USER',
            is_verified=True
        )
        self.user2 = User.objects.create_user(
            username='user2',
            email='user2@example.com',
            password='pass123',
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
        
        self.rma_user1 = RMA.objects.create(
            serial_number='SN123',
            priority='NORMAL',
            fault_notes='Test issue',
            state='SUBMITTED',
            owner=self.user1
        )
    
    def test_user_can_view_own_rma(self):
        """Test user can view their own RMA."""
        self.client.force_authenticate(user=self.user1)
        
        response = self.client.get(f'/api/rma/{self.rma_user1.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['serial_number'], 'SN123')
    
    def test_user_cannot_view_other_users_rma(self):
        """Test user cannot view another user's RMA."""
        self.client.force_authenticate(user=self.user2)
        
        response = self.client.get(f'/api/rma/{self.rma_user1.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_admin_can_view_any_rma(self):
        """Test admin can view any user's RMA."""
        self.client.force_authenticate(user=self.admin)
        
        response = self.client.get(f'/api/rma/{self.rma_user1.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_user_can_list_only_own_rmas(self):
        """Test user sees only their own RMAs in list."""
        # Create RMAs for different users
        RMA.objects.create(
            serial_number='SN456',
            priority='HIGH',
            fault_notes='Test',
            owner=self.user2
        )
        
        self.client.force_authenticate(user=self.user1)
        response = self.client.get('/api/rma/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Response is now a direct list (pagination disabled)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['serial_number'], 'SN123')
    
    def test_admin_can_list_all_rmas(self):
        """Test admin sees all RMAs in list."""
        RMA.objects.create(
            serial_number='SN456',
            priority='HIGH',
            fault_notes='Test',
            owner=self.user2
        )
        
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/rma/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Response is now a direct list (pagination disabled)
        self.assertEqual(len(response.data), 2)


class RMASearchFilterTests(TestCase):
    """Test RMA search and filtering functionality."""
    
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username='admin',
            email='admin@example.com',
            password='adminpass123',
            role='ADMIN',
            is_verified=True
        )
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            role='USER',
            is_verified=True
        )
        
        # Create test RMAs with different attributes  
        self.rma1 = RMA.objects.create(
            serial_number='SN123',
            priority='HIGH',
            fault_notes='Critical issue',
            state='SUBMITTED',
            owner=self.user
        )
        self.rma2 = RMA.objects.create(
            serial_number='SN456',
            priority='NORMAL',
            fault_notes='Normal issue',
            state='APPROVED',
            owner=self.user
        )
        self.rma3 = RMA.objects.create(
            serial_number='SN789',
            priority='LOW',
            fault_notes='Minor issue',
            state='COMPLETED',
            owner=self.user
        )
        
        self.client.force_authenticate(user=self.admin)
    
    def test_filter_by_state(self):
        """Test filtering RMAs by state."""
        response = self.client.get('/api/rma/search/?state=APPROVED')
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['serial_number'], 'SN456')
    
    def test_filter_by_priority(self):
        """Test filtering RMAs by priority."""
        response = self.client.get('/api/rma/search/?priority=HIGH')
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['serial_number'], 'SN123')
    
    def test_search_by_serial_number(self):
        """Test searching by serial number."""
        response = self.client.get('/api/rma/search/?q=SN456')
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['serial_number'], 'SN456')


class RMANumberGenerationTests(TestCase):
    """Test RMA number auto-generation."""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            role='USER',
            is_verified=True
        )
    
    def test_rma_number_auto_generated(self):
        """Test RMA numbers are automatically generated."""
        rma = RMA.objects.create(
            serial_number='SN123',
            priority='NORMAL',
            fault_notes='Test',
            owner=self.user
        )
        
        self.assertIsNotNone(rma.rma_number)
        self.assertIsInstance(rma.rma_number, int)
    
    def test_rma_numbers_are_unique(self):
        """Test each RMA gets a unique number."""
        rma1 = RMA.objects.create(
            serial_number='SN123',
            priority='NORMAL',
            fault_notes='Test',
            owner=self.user
        )
        rma2 = RMA.objects.create(
            serial_number='SN456',
            priority='NORMAL',
            fault_notes='Test',
            owner=self.user
        )
        
        self.assertNotEqual(rma1.rma_number, rma2.rma_number)
    
    def test_rma_numbers_increment(self):
        """Test RMA numbers increment sequentially."""
        rmas = []
        for i in range(5):
            rma = RMA.objects.create(
                serial_number=f'SN{i}',
                priority='NORMAL',
                fault_notes='Test',
                owner=self.user
            )
            rmas.append(rma)
        
        # Verify they increment
        for i in range(1, len(rmas)):
            self.assertEqual(rmas[i].rma_number, rmas[i-1].rma_number + 1)
