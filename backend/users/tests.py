from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

User = get_user_model()


class UserAuthenticationTests(TestCase):
    """Test user authentication functionality."""
    
    def setUp(self):
        self.client = APIClient()
        self.register_url = '/api/auth/register/'
        self.login_url = '/api/auth/login/'
        self.me_url = '/api/auth/me/'
        
        # Create test users
        self.verified_user = User.objects.create_user(
            username='verified_user',
            email='verified@test.com',
            password='testpass123',
            role='USER',
            is_verified=True
        )
        
        self.admin_user = User.objects.create_user(
            username='admin_user',
            email='admin@test.com',
            password='adminpass123',
            role='ADMIN',
            is_verified=True
        )
    
    def test_user_registration_success(self):
        """Test successful user registration."""
        data = {
            'username': 'newuser',
            'email': 'newuser@test.com',
            'password': 'newpass123',
            'password2': 'newpass123',
            'first_name': 'New',
            'last_name': 'User'
        }
        response = self.client.post(self.register_url, data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('user', response.data)
        self.assertEqual(response.data['user']['username'], 'newuser')
        self.assertFalse(response.data['user']['is_verified'])
    
    def test_user_registration_password_mismatch(self):
        """Test registration fails with password mismatch."""
        data = {
            'username': 'newuser',
            'email': 'newuser@test.com',
            'password': 'newpass123',
            'password2': 'differentpass',
        }
        response = self.client.post(self.register_url, data)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_login_success(self):
        """Test successful login."""
        data = {
            'username': 'verified_user',
            'password': 'testpass123'
        }
        response = self.client.post(self.login_url, data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
    
    def test_login_unverified_user(self):
        """Test unverified user cannot login."""
        User.objects.create_user(
            username='unverified',
            email='unverified@test.com',
            password='testpass123',
            is_verified=False
        )
        
        data = {
            'username': 'unverified',
            'password': 'testpass123'
        }
        response = self.client.post(self.login_url, data)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class UserApprovalTests(TestCase):
    """Test user approval workflow."""
    
    def setUp(self):
        self.client = APIClient()
        self.admin_user = User.objects.create_user(
            username='admin',
            email='admin@test.com',
            password='adminpass123',
            role='ADMIN',
            is_verified=True
        )
        self.pending_user = User.objects.create_user(
            username='pending',
            email='pending@test.com',
            password='testpass123',
            role='USER',
            is_verified=False
        )
    
    def test_admin_can_approve_user(self):
        """Test admin can approve a user."""
        self.client.force_authenticate(user=self.admin_user)
        approve_url = f'/api/auth/{self.pending_user.id}/approve/'
        
        response = self.client.post(approve_url, {'approve': True})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.pending_user.refresh_from_db()
        self.assertTrue(self.pending_user.is_verified)
