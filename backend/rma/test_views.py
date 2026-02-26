"""
Tests for RMA views/API endpoints.
"""
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from rma.models import RMA, RMAGroup
from core.test_utils import create_mock_user, create_mock_admin, authenticate_user


class RMAListCreateViewTest(TestCase):
    """Test RMA list and create endpoints."""
    
    def setUp(self):
        """Set up test data."""
        self.client = APIClient()
        self.user = create_mock_user(user_id=1, username='user1')
        self.user2 = create_mock_user(user_id=2, username='user2')
        self.admin = create_mock_admin(user_id=3, username='admin')
        
        # Create test RMAs
        self.rma1 = RMA.objects.create(
            serial_number='SN1',
            owner=self.user,
            fault_notes='Issue 1'
        )
        self.rma2 = RMA.objects.create(
            serial_number='SN2',
            owner=self.user2,
            fault_notes='Issue 2'
        )
    
    def test_list_rmas_as_user(self):
        """Test user can only see their own RMAs."""
        authenticate_user(self.client, self.user)
        response = self.client.get('/api/rma/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['serial_number'], 'SN1')
    
    def test_list_rmas_as_admin(self):
        """Test admin can see all RMAs."""
        authenticate_user(self.client, self.admin)
        response = self.client.get('/api/rma/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
    
    def test_create_rma(self):
        """Test creating a new RMA."""
        authenticate_user(self.client, self.user)
        data = {
            'serial_number': 'SN999',
            'fault_notes': 'Test issue',
            'priority': 'NORMAL'
        }
        response = self.client.post('/api/rma/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['serial_number'], 'SN999')
        # Owner should be set to the authenticated user
        if 'owner' in response.data:
            self.assertEqual(response.data['owner']['id'], self.user.id)
    
    def test_list_archived_filter(self):
        """Test filtering archived RMAs."""
        # Create completed RMA
        RMA.objects.create(
            serial_number='SN3',
            owner=self.user,
            state=RMA.State.COMPLETED
        )
        
        authenticate_user(self.client, self.user)
        
        # Test active RMAs
        response = self.client.get('/api/rma/?archived=false')
        self.assertEqual(len(response.data), 1)
        
        # Test archived RMAs
        response = self.client.get('/api/rma/?archived=true')
        self.assertEqual(len(response.data), 1)


class RMADetailViewTest(TestCase):
    """Test RMA detail, update, delete endpoints."""
    
    def setUp(self):
        """Set up test data."""
        self.client = APIClient()
        self.user = create_mock_user(user_id=1)
        self.user2 = create_mock_user(user_id=2)
        self.admin = create_mock_admin(user_id=3)
        
        self.rma = RMA.objects.create(
            serial_number='SN1',
            owner=self.user,
            fault_notes='Test issue'
        )
    
    def test_get_rma_detail_as_owner(self):
        """Test user can view their own RMA."""
        authenticate_user(self.client, self.user)
        response = self.client.get(f'/api/rma/{self.rma.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['serial_number'], 'SN1')
    
    def test_get_rma_detail_as_other_user(self):
        """Test user cannot view another user's RMA."""
        authenticate_user(self.client, self.user2)
        response = self.client.get(f'/api/rma/{self.rma.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_get_rma_detail_as_admin(self):
        """Test admin can view any RMA."""
        authenticate_user(self.client, self.admin)
        response = self.client.get(f'/api/rma/{self.rma.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_update_rma(self):
        """Test updating RMA."""
        authenticate_user(self.client, self.admin)
        data = {'priority': 'HIGH'}
        response = self.client.patch(
            f'/api/rma/{self.rma.id}/',
            data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.rma.refresh_from_db()
        self.assertEqual(self.rma.priority, RMA.Priority.HIGH)


class RMAStateUpdateViewTest(TestCase):
    """Test RMA state transition endpoint."""
    
    def setUp(self):
        """Set up test data."""
        self.client = APIClient()
        self.user = create_mock_user(user_id=1)
        self.admin = create_mock_admin(user_id=2)
        
        self.rma = RMA.objects.create(
            serial_number='SN1',
            owner=self.user,
            state=RMA.State.SUBMITTED
        )
    
    def test_state_update_as_non_admin(self):
        """Test non-admin cannot update state."""
        authenticate_user(self.client, self.user)
        data = {'state': RMA.State.APPROVED}
        response = self.client.post(
            f'/api/rma/{self.rma.id}/state/',
            data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_state_update_as_admin(self):
        """Test admin can update state."""
        authenticate_user(self.client, self.admin)
        data = {'state': RMA.State.APPROVED, 'notes': 'Approved for RMA'}
        response = self.client.post(
            f'/api/rma/{self.rma.id}/state/',
            data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.rma.refresh_from_db()
        self.assertEqual(self.rma.state, RMA.State.APPROVED)
    
    def test_invalid_state_transition(self):
        """Test invalid state transition is rejected."""
        authenticate_user(self.client, self.admin)
        data = {'state': RMA.State.SHIPPED}  # Can't go from SUBMITTED to SHIPPED
        response = self.client.post(
            f'/api/rma/{self.rma.id}/state/',
            data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class RMAGroupCreateViewTest(TestCase):
    """Test RMA group creation."""
    
    def setUp(self):
        """Set up test data."""
        self.client = APIClient()
        self.user = create_mock_user(user_id=1)
    
    def test_create_rma_group(self):
        """Test creating multiple RMAs in a group."""
        authenticate_user(self.client, self.user)
        data = {
            'rmas': [
                {
                    'serial_number': 'SN1',
                    'fault_notes': 'Issue 1',
                    'priority': 'NORMAL'
                },
                {
                    'serial_number': 'SN2',
                    'fault_notes': 'Issue 2',
                    'priority': 'HIGH'
                }
            ]
        }
        response = self.client.post('/api/rma/group/', data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(response.data['rmas']), 2)
        
        # Verify group was created
        group_id = response.data['group']['id']
        group = RMAGroup.objects.get(id=group_id)
        self.assertEqual(group.rmas.count(), 2)


class RMASearchViewTest(TestCase):
    """Test RMA search endpoint (admin only)."""
    
    def setUp(self):
        """Set up test data."""
        self.client = APIClient()
        self.user = create_mock_user(user_id=1)
        self.admin = create_mock_admin(user_id=2)
        
        # Create searchable RMAs
        self.rma1 = RMA.objects.create(
            serial_number='ABC123',
            owner=self.user,
            fault_notes='Network issue'
        )
        self.rma2 = RMA.objects.create(
            serial_number='XYZ789',
            owner=self.user,
            fault_notes='Power problem'
        )
    
    def test_search_as_non_admin(self):
        """Test non-admin cannot access search."""
        authenticate_user(self.client, self.user)
        response = self.client.get('/api/rma/search/')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_search_as_admin(self):
        """Test admin can search RMAs."""
        authenticate_user(self.client, self.admin)
        response = self.client.get('/api/rma/search/?q=ABC')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should find rma1 based on serial number
        results = response.data.get('results', response.data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['serial_number'], 'ABC123')
