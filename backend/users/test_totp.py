"""
Tests for TOTP/2FA functionality.
"""
from django.test import TestCase
from unittest import skip
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from django_otp.plugins.otp_totp.models import TOTPDevice
from users.models import User


class TOTPSetupTests(TestCase):
    """Test TOTP setup functionality."""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            role='USER',
            is_verified=True
        )
        self.client.force_authenticate(user=self.user)
    
    def test_totp_setup_generates_qr_code(self):
        """Test TOTP setup returns QR code."""
        response = self.client.post('/api/auth/totp/setup/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('qr_code', response.data)
        self.assertIn('secret', response.data)
        self.assertTrue(response.data['qr_code'].startswith('data:image/png;base64,'))
    
    def test_totp_setup_creates_unconfirmed_device(self):
        """Test TOTP setup creates unconfirmed device."""
        response = self.client.post('/api/auth/totp/setup/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        device = TOTPDevice.objects.filter(user=self.user, confirmed=False).first()
        self.assertIsNotNone(device)
    
    def test_totp_setup_when_already_enabled(self):
        """Test TOTP setup fails when already enabled."""
        # Create confirmed device
        TOTPDevice.objects.create(user=self.user, name='default', confirmed=True)
        
        response = self.client.post('/api/auth/totp/setup/')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('already enabled', response.data['error'].lower())
    
    def test_totp_setup_deletes_old_unconfirmed_devices(self):
        """Test TOTP setup deletes old unconfirmed devices."""
        # Create old unconfirmed device
        old_device = TOTPDevice.objects.create(user=self.user, name='default', confirmed=False)
        
        response = self.client.post('/api/auth/totp/setup/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Old device should be deleted
        self.assertFalse(TOTPDevice.objects.filter(id=old_device.id).exists())
    
    def test_totp_setup_requires_authentication(self):
        """Test TOTP setup requires authentication."""
        self.client.force_authenticate(user=None)
        response = self.client.post('/api/auth/totp/setup/')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class TOTPConfirmTests(TestCase):
    """Test TOTP confirmation functionality."""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            role='USER',
            is_verified=True
        )
        self.client.force_authenticate(user=self.user)
    
    @skip("TOTP token generation requires pyotp")
    def test_totp_confirm_with_valid_token(self):
        """Test TOTP confirm with valid token."""
        pass
    
    def test_totp_confirm_with_invalid_token(self):
        """Test TOTP confirm with invalid token."""
        # Setup TOTP
        self.client.post('/api/auth/totp/setup/')
        
        response = self.client.post('/api/auth/totp/confirm/', {'token': '000000'})
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_totp_confirm_without_token(self):
        """Test TOTP confirm without token."""
        response = self.client.post('/api/auth/totp/confirm/', {})
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_totp_confirm_without_setup(self):
        """Test TOTP confirm without prior setup."""
        response = self.client.post('/api/auth/totp/confirm/', {'token': '123456'})
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class TOTPDisableTests(TestCase):
    """Test TOTP disable functionality."""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            role='USER',
            is_verified=True
        )
        self.client.force_authenticate(user=self.user)
    
    @skip("TOTP token generation requires pyotp")
    def test_totp_disable_with_valid_token(self):
        """Test TOTP disable with valid token."""
        pass
    
    def test_totp_disable_with_invalid_token(self):
        """Test TOTP disable with invalid token."""
        TOTPDevice.objects.create(user=self.user, name='default', confirmed=True)
        
        response = self.client.post('/api/auth/totp/disable/', {'token': '000000'})
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        # Device should still exist
        self.assertTrue(TOTPDevice.objects.filter(user=self.user).exists())
    
    def test_totp_disable_without_token(self):
        """Test TOTP disable without token."""
        response = self.client.post('/api/auth/totp/disable/', {})
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_totp_disable_when_not_enabled(self):
        """Test TOTP disable when not enabled."""
        response = self.client.post('/api/auth/totp/disable/', {'token': '123456'})
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class TOTPStatusTests(TestCase):
    """Test TOTP status check functionality."""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            role='USER',
            is_verified=True
        )
        self.client.force_authenticate(user=self.user)
    
    def test_totp_status_when_enabled(self):
        """Test TOTP status when enabled."""
        TOTPDevice.objects.create(user=self.user, name='default', confirmed=True)
        
        response = self.client.get('/api/auth/totp/status/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['enabled'])
        self.assertEqual(response.data['device_name'], 'default')
    
    def test_totp_status_when_disabled(self):
        """Test TOTP status when disabled."""
        response = self.client.get('/api/auth/totp/status/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['enabled'])
        self.assertIsNone(response.data['device_name'])
    
    def test_totp_status_requires_authentication(self):
        """Test TOTP status requires authentication."""
        self.client.force_authenticate(user=None)
        response = self.client.get('/api/auth/totp/status/')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
