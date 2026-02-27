"""
Tests for core authentication classes.
"""
from django.test import TestCase, RequestFactory
from unittest.mock import patch
from rest_framework.exceptions import AuthenticationFailed
from core.authentication import (
    AuthinatorJWTAuthentication,
    _get_or_create_local_user,
    _attach_authinator_attrs,
)
from users.models import User


class GetOrCreateLocalUserTest(TestCase):
    """Test _get_or_create_local_user helper."""

    def test_creates_new_user(self):
        user_data = {'id': 500, 'username': 'newuser', 'email': 'new@example.com'}
        user = _get_or_create_local_user(user_data)
        self.assertEqual(user.id, 500)
        self.assertEqual(user.username, 'newuser')
        self.assertTrue(User.objects.filter(id=500).exists())

    def test_returns_existing_user(self):
        User.objects.create(id=600, username='existing', email='e@example.com')
        user_data = {'id': 600, 'username': 'existing', 'email': 'e@example.com'}
        user = _get_or_create_local_user(user_data)
        self.assertEqual(user.id, 600)

    def test_syncs_changed_username(self):
        User.objects.create(id=700, username='old_name', email='e@example.com')
        user_data = {'id': 700, 'username': 'new_name', 'email': 'e@example.com'}
        user = _get_or_create_local_user(user_data)
        self.assertEqual(user.username, 'new_name')
        user.refresh_from_db()
        self.assertEqual(user.username, 'new_name')


class AttachAuthinatorAttrsTest(TestCase):
    """Test _attach_authinator_attrs helper."""

    def test_admin_attrs(self):
        user = User(id=1, username='admin')
        _attach_authinator_attrs(user, {'role': 'ADMIN'})
        self.assertTrue(user.is_admin)
        self.assertTrue(user.is_system_admin())
        self.assertTrue(user.is_customer_admin())
        self.assertTrue(user.can_manage_users())

    def test_user_attrs(self):
        user = User(id=2, username='regular')
        _attach_authinator_attrs(user, {'role': 'USER'})
        self.assertFalse(user.is_admin)
        self.assertFalse(user.is_system_admin())
        self.assertFalse(user.can_manage_users())


class AuthinatorJWTAuthenticationTest(TestCase):
    """Test AuthinatorJWTAuthentication class."""
    
    def setUp(self):
        """Set up test dependencies."""
        self.factory = RequestFactory()
        self.auth = AuthinatorJWTAuthentication()
    
    def test_no_auth_header(self):
        """Test authentication with no auth header."""
        request = self.factory.get('/')
        
        result = self.auth.authenticate(request)
        
        self.assertIsNone(result)
    
    def test_invalid_auth_header_format_single_part(self):
        """Test authentication with invalid auth header format."""
        request = self.factory.get('/', HTTP_AUTHORIZATION='InvalidToken')
        
        with self.assertRaises(AuthenticationFailed) as context:
            self.auth.authenticate(request)
        
        self.assertIn('Invalid authorization header format', str(context.exception))
    
    def test_invalid_auth_header_format_wrong_scheme(self):
        """Test authentication with wrong auth scheme."""
        request = self.factory.get('/', HTTP_AUTHORIZATION='Basic token123')
        
        with self.assertRaises(AuthenticationFailed) as context:
            self.auth.authenticate(request)
        
        self.assertIn('Invalid authorization header format', str(context.exception))
    
    @patch('core.authentication.authinator_client')
    def test_invalid_token(self, mock_client):
        """Test authentication with invalid token."""
        mock_client.get_user_from_token.return_value = None
        
        request = self.factory.get('/', HTTP_AUTHORIZATION='Bearer invalid_token')
        
        with self.assertRaises(AuthenticationFailed) as context:
            self.auth.authenticate(request)
        
        self.assertIn('Invalid or expired token', str(context.exception))
    
    @patch('core.authentication.authinator_client')
    def test_inactive_user(self, mock_client):
        """Test authentication with inactive user."""
        mock_client.get_user_from_token.return_value = {
            'id': 1,
            'username': 'testuser',
            'email': 'test@example.com',
            'role': 'USER',
            'is_active': False
        }
        
        request = self.factory.get('/', HTTP_AUTHORIZATION='Bearer valid_token')
        
        with self.assertRaises(AuthenticationFailed) as context:
            self.auth.authenticate(request)
        
        self.assertIn('User account is not active', str(context.exception))
    
    @patch('core.authentication.authinator_client')
    def test_valid_authentication(self, mock_client):
        """Test successful authentication returns a real User model instance."""
        mock_client.get_user_from_token.return_value = {
            'id': 1,
            'username': 'testuser',
            'email': 'test@example.com',
            'role': 'USER',
            'is_active': True,
            'is_verified': True
        }

        request = self.factory.get('/', HTTP_AUTHORIZATION='Bearer valid_token')

        user, token = self.auth.authenticate(request)

        self.assertIsInstance(user, User)
        self.assertEqual(user.id, 1)
        self.assertEqual(user.username, 'testuser')
        self.assertFalse(user.is_admin)
        self.assertEqual(token, 'valid_token')
        mock_client.get_user_from_token.assert_called_once_with('valid_token')

    @patch('core.authentication.authinator_client')
    def test_valid_admin_authentication(self, mock_client):
        """Test admin user gets is_admin=True."""
        mock_client.get_user_from_token.return_value = {
            'id': 2,
            'username': 'admin',
            'email': 'admin@example.com',
            'role': 'ADMIN',
            'is_active': True,
        }

        request = self.factory.get('/', HTTP_AUTHORIZATION='Bearer admin_token')

        user, token = self.auth.authenticate(request)

        self.assertIsInstance(user, User)
        self.assertTrue(user.is_admin)
        self.assertTrue(user.is_system_admin())
