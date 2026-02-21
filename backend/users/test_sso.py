"""
Tests for SSO authentication functionality.
"""
from django.test import TestCase, RequestFactory
from django.contrib.auth import get_user_model
from django.http import HttpRequest
from allauth.socialaccount.models import SocialAccount, SocialApp
from allauth.socialaccount.adapter import get_adapter
from users.adapters import CustomSocialAccountAdapter
from users.sso_views import sso_callback_view
from unittest.mock import Mock, MagicMock

User = get_user_model()


class SSOAdapterTests(TestCase):
    """Test CustomSocialAccountAdapter functionality."""
    
    def setUp(self):
        self.factory = RequestFactory()
        self.adapter = CustomSocialAccountAdapter()
        
    def test_is_auto_signup_allowed(self):
        """Test that auto signup is allowed."""
        request = self.factory.get('/')
        sociallogin = Mock()
        
        result = self.adapter.is_auto_signup_allowed(request, sociallogin)
        
        self.assertTrue(result)
        
    def test_populate_user_generates_username_from_email(self):
        """Test username generation from email."""
        request = self.factory.get('/')
        sociallogin = Mock()
        data = {
            'email': 'testuser@example.com',
            'first_name': 'Test',
            'last_name': 'User'
        }
        
        user = User()
        user.email = data['email']
        
        result = self.adapter.populate_user(request, sociallogin, data)
        
        self.assertEqual(result.username, 'testuser')
        self.assertEqual(result.role, 'USER')
        self.assertFalse(result.is_verified)
        self.assertEqual(result.first_name, 'Test')
        self.assertEqual(result.last_name, 'User')
        
    def test_populate_user_ensures_unique_username(self):
        """Test that duplicate usernames get incremented."""
        # Create existing user
        User.objects.create_user(
            username='testuser',
            email='existing@example.com',
            password='test123'
        )
        
        request = self.factory.get('/')
        sociallogin = Mock()
        data = {'email': 'testuser@newdomain.com'}
        
        user = User()
        user.email = data['email']
        
        result = self.adapter.populate_user(request, sociallogin, data)
        
        self.assertEqual(result.username, 'testuser1')
        
    def test_save_user_sets_just_registered_flag(self):
        """Test that save_user sets the _just_registered flag."""
        request = self.factory.get('/')
        request.user = Mock()
        
        # Create a proper sociallogin mock
        sociallogin = Mock()
        sociallogin.user = User.objects.create_user(
            username='newuser',
            email='newuser@example.com',
            password='test123',
            is_verified=False
        )
        
        result = self.adapter.save_user(request, sociallogin)
        
        self.assertTrue(hasattr(result, '_just_registered'))
        self.assertTrue(result._just_registered)
        
    def test_get_login_redirect_url(self):
        """Test login redirect URL points to SSO callback."""
        request = self.factory.get('/')
        
        url = self.adapter.get_login_redirect_url(request)
        
        self.assertEqual(url, '/api/auth/sso/callback/')


class SSOCallbackViewTests(TestCase):
    """Test SSO callback view functionality."""
    
    def setUp(self):
        self.factory = RequestFactory()
        
    def test_unauthenticated_user_gets_error(self):
        """Test that unauthenticated users get an error."""
        request = self.factory.get('/api/auth/sso/callback/')
        request.user = Mock()
        request.user.is_authenticated = False
        
        response = sso_callback_view(request)
        
        self.assertEqual(response.status_code, 302)
        self.assertIn('error=authentication_failed', response.url)
        
    def test_unverified_user_gets_pending_approval_error(self):
        """Test that unverified users get pending approval error."""
        user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='test123',
            is_verified=False
        )
        
        request = self.factory.get('/api/auth/sso/callback/')
        request.user = user
        # Mock session with flush method
        request.session = Mock()
        request.session.flush = Mock()
        
        response = sso_callback_view(request)
        
        self.assertEqual(response.status_code, 302)
        self.assertIn('error=pending_approval', response.url)
        self.assertIn('message=', response.url)
        # Verify session was flushed
        request.session.flush.assert_called_once()
        
    def test_verified_user_gets_jwt_tokens(self):
        """Test that verified users get JWT tokens in redirect."""
        user = User.objects.create_user(
            username='verifieduser',
            email='verified@example.com',
            password='test123',
            is_verified=True
        )
        
        request = self.factory.get('/api/auth/sso/callback/')
        request.user = user
        # Mock session with flush method
        request.session = Mock()
        request.session.flush = Mock()
        
        response = sso_callback_view(request)
        
        self.assertEqual(response.status_code, 302)
        self.assertIn('access=', response.url)
        self.assertIn('refresh=', response.url)
        self.assertIn('http://localhost:5173/auth/callback', response.url)
        # Verify session was flushed
        request.session.flush.assert_called_once()
        
    def test_session_cookie_deleted_for_unverified_user(self):
        """Test that session cookie is deleted for unverified users."""
        user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='test123',
            is_verified=False
        )
        
        request = self.factory.get('/api/auth/sso/callback/')
        request.user = user
        # Mock session with flush method
        request.session = Mock()
        request.session.flush = Mock()
        
        response = sso_callback_view(request)
        
        # Check that session cookie was deleted
        self.assertIn('sessionid', response.cookies)
        # Cookie value should be empty string when deleted
        self.assertEqual(response.cookies['sessionid'].value, '')
        
    def test_session_cookie_deleted_for_verified_user(self):
        """Test that session cookie is deleted after issuing JWT tokens."""
        user = User.objects.create_user(
            username='verifieduser',
            email='verified@example.com',
            password='test123',
            is_verified=True
        )
        
        request = self.factory.get('/api/auth/sso/callback/')
        request.user = user
        # Mock session with flush method
        request.session = Mock()
        request.session.flush = Mock()
        
        response = sso_callback_view(request)
        
        # Check that session cookie was deleted
        self.assertIn('sessionid', response.cookies)
        # Cookie value should be empty string when deleted
        self.assertEqual(response.cookies['sessionid'].value, '')


class SSOIntegrationTests(TestCase):
    """Integration tests for SSO flow."""
    
    def test_new_sso_user_requires_approval(self):
        """Test that new SSO users require admin approval."""
        adapter = CustomSocialAccountAdapter()
        request = RequestFactory().get('/')
        sociallogin = Mock()
        data = {'email': 'newssouser@example.com'}
        
        user = User()
        user.email = data['email']
        populated_user = adapter.populate_user(request, sociallogin, data)
        
        self.assertFalse(populated_user.is_verified)
        self.assertEqual(populated_user.role, 'USER')
