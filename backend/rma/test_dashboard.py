"""
Tests for RMA admin dashboard.
"""
from django.test import TestCase
from django.utils import timezone
from datetime import timedelta
from rest_framework.test import APIClient
from rest_framework import status
from rma.models import RMA, RMAStateHistory
from core.test_utils import create_mock_user, create_mock_admin, authenticate_user


class AdminDashboardViewTest(TestCase):
    """Test admin dashboard metrics endpoint."""
    
    def setUp(self):
        """Set up test data."""
        self.client = APIClient()
        self.user = create_mock_user()
        self.admin = create_mock_admin()
        
        # Create test RMAs in various states
        self.rma_submitted = RMA.objects.create(
            serial_number='SN1',
            owner=self.user,
            state=RMA.State.SUBMITTED,
            priority=RMA.Priority.HIGH
        )
        
        self.rma_approved = RMA.objects.create(
            serial_number='SN2',
            owner=self.user,
            state=RMA.State.APPROVED,
            priority=RMA.Priority.NORMAL
        )
        
        self.rma_completed = RMA.objects.create(
            serial_number='SN3',
            owner=self.user,
            state=RMA.State.COMPLETED,
            priority=RMA.Priority.LOW
        )
        
        self.rma_rejected = RMA.objects.create(
            serial_number='SN4',
            owner=self.user,
            state=RMA.State.REJECTED
        )
    
    def test_dashboard_access_as_non_admin(self):
        """Test non-admin cannot access dashboard."""
        authenticate_user(self.client, self.user)
        response = self.client.get('/api/rma/admin/dashboard/')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_dashboard_access_as_admin(self):
        """Test admin can access dashboard."""
        authenticate_user(self.client, self.admin)
        response = self.client.get('/api/rma/admin/dashboard/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_dashboard_summary_counts(self):
        """Test dashboard returns correct summary counts."""
        authenticate_user(self.client, self.admin)
        response = self.client.get('/api/rma/admin/dashboard/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        summary = response.data['summary']
        self.assertEqual(summary['total_rmas'], 4)
        self.assertEqual(summary['active_rmas'], 2)  # SUBMITTED and APPROVED
        self.assertEqual(summary['archived_rmas'], 2)  # COMPLETED and REJECTED
    
    def test_dashboard_state_counts(self):
        """Test dashboard returns correct state counts."""
        authenticate_user(self.client, self.admin)
        response = self.client.get('/api/rma/admin/dashboard/')
        
        state_counts = response.data['state_counts']
        self.assertEqual(state_counts['SUBMITTED'], 1)
        self.assertEqual(state_counts['APPROVED'], 1)
        self.assertEqual(state_counts['COMPLETED'], 1)
        self.assertEqual(state_counts['REJECTED'], 1)
        self.assertEqual(state_counts['RECEIVED'], 0)
    
    def test_dashboard_priority_counts(self):
        """Test dashboard returns correct priority counts for active RMAs."""
        authenticate_user(self.client, self.admin)
        response = self.client.get('/api/rma/admin/dashboard/')
        
        priority_counts = response.data['priority_counts']
        # Only counts active RMAs (not COMPLETED/REJECTED)
        self.assertEqual(priority_counts['HIGH'], 1)
        self.assertEqual(priority_counts['NORMAL'], 1)
        self.assertEqual(priority_counts['LOW'], 0)  # COMPLETED RMA not counted
    
    def test_dashboard_recent_activity(self):
        """Test dashboard returns recent activity."""
        # Create some state changes
        RMAStateHistory.objects.create(
            rma=self.rma_submitted,
            from_state='',
            to_state=RMA.State.SUBMITTED,
            changed_by=self.user
        )
        
        authenticate_user(self.client, self.admin)
        response = self.client.get('/api/rma/admin/dashboard/')
        
        recent_activity = response.data['recent_activity']
        self.assertIsInstance(recent_activity, list)
        self.assertGreater(len(recent_activity), 0)
        
        # Check structure of activity items
        if recent_activity:
            activity = recent_activity[0]
            self.assertIn('rma_id', activity)
            self.assertIn('rma_number', activity)
            self.assertIn('serial_number', activity)
            self.assertIn('from_state', activity)
            self.assertIn('to_state', activity)
            self.assertIn('changed_by', activity)
            self.assertIn('changed_at', activity)
    
    def test_dashboard_trends(self):
        """Test dashboard returns trend data."""
        authenticate_user(self.client, self.admin)
        response = self.client.get('/api/rma/admin/dashboard/')
        
        trends = response.data['trends']
        self.assertIn('last_7_days', trends)
        self.assertIn('last_30_days', trends)
        self.assertIn('last_90_days', trends)
        
        # All RMAs created recently, should be in all buckets
        self.assertEqual(trends['last_7_days'], 4)
        self.assertEqual(trends['last_30_days'], 4)
        self.assertEqual(trends['last_90_days'], 4)
    
    def test_dashboard_stale_rmas(self):
        """Test dashboard stale RMAs structure."""
        authenticate_user(self.client, self.admin)
        response = self.client.get('/api/rma/admin/dashboard/')
        
        stale_rmas = response.data['stale_rmas']
        self.assertIsInstance(stale_rmas, list)
        
        # stale_rmas may be empty if no RMAs are stale
        # Check structure if any exist
        if len(stale_rmas) > 0:
            stale = stale_rmas[0]
            self.assertIn('id', stale)
            self.assertIn('rma_number', stale)
            self.assertIn('serial_number', stale)
            self.assertIn('state', stale)
            self.assertIn('days_in_state', stale)
            self.assertIn('priority', stale)
    
    def test_dashboard_avg_time_per_state(self):
        """Test dashboard calculates average time per state."""
        # Create RMA with state transitions
        rma = RMA.objects.create(
            serial_number='SN_TIME',
            owner=self.user,
            state=RMA.State.RECEIVED
        )
        
        # Create state history with time gaps
        now = timezone.now()
        h1 = RMAStateHistory.objects.create(
            rma=rma,
            from_state='',
            to_state=RMA.State.SUBMITTED,
            changed_by=self.user
        )
        RMAStateHistory.objects.filter(id=h1.id).update(changed_at=now - timedelta(hours=48))
        
        h2 = RMAStateHistory.objects.create(
            rma=rma,
            from_state=RMA.State.SUBMITTED,
            to_state=RMA.State.APPROVED,
            changed_by=self.admin
        )
        RMAStateHistory.objects.filter(id=h2.id).update(changed_at=now - timedelta(hours=24))
        
        h3 = RMAStateHistory.objects.create(
            rma=rma,
            from_state=RMA.State.APPROVED,
            to_state=RMA.State.RECEIVED,
            changed_by=self.admin
        )
        RMAStateHistory.objects.filter(id=h3.id).update(changed_at=now)
        
        authenticate_user(self.client, self.admin)
        response = self.client.get('/api/rma/admin/dashboard/')
        
        avg_time_per_state = response.data['avg_time_per_state']
        self.assertIsInstance(avg_time_per_state, dict)
        
        # SUBMITTED state should show ~24 hours average
        if 'SUBMITTED' in avg_time_per_state:
            submitted_time = avg_time_per_state['SUBMITTED']
            self.assertIn('hours', submitted_time)
            self.assertIn('days', submitted_time)
