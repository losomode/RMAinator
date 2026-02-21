"""
Tests for WebAuthn functionality.
"""
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from users.models import User
from webauthn_auth.models import WebAuthnCredential, WebAuthnChallenge


class WebAuthnCredentialListTests(TestCase):
    """Test WebAuthn credential listing."""
    
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
    
    def test_list_credentials_empty(self):
        """Test listing credentials when none exist."""
        response = self.client.get('/api/auth/webauthn/credentials/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)
    
    def test_list_credentials_with_data(self):
        """Test listing credentials when some exist."""
        # Create test credentials
        WebAuthnCredential.objects.create(
            user=self.user,
            credential_id=b'test123',
            public_key=b'pubkey123',
            sign_count=0,
            name='Test Key 1'
        )
        WebAuthnCredential.objects.create(
            user=self.user,
            credential_id=b'test456',
            public_key=b'pubkey456',
            sign_count=0,
            name='Test Key 2'
        )
        
        response = self.client.get('/api/auth/webauthn/credentials/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        # Credentials are ordered by -created_at (newest first)
        self.assertEqual(response.data[0]['name'], 'Test Key 2')
        self.assertEqual(response.data[1]['name'], 'Test Key 1')
    
    def test_list_credentials_requires_authentication(self):
        """Test listing credentials requires authentication."""
        self.client.force_authenticate(user=None)
        response = self.client.get('/api/auth/webauthn/credentials/')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_list_credentials_only_shows_own(self):
        """Test user only sees their own credentials."""
        other_user = User.objects.create_user(
            username='other',
            email='other@example.com',
            password='pass123'
        )
        
        # Create credential for current user
        WebAuthnCredential.objects.create(
            user=self.user,
            credential_id=b'mykey',
            public_key=b'pubkey',
            sign_count=0,
            name='My Key'
        )
        
        # Create credential for other user
        WebAuthnCredential.objects.create(
            user=other_user,
            credential_id=b'otherkey',
            public_key=b'pubkey',
            sign_count=0,
            name='Other Key'
        )
        
        response = self.client.get('/api/auth/webauthn/credentials/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['name'], 'My Key')


class WebAuthnCredentialDeleteTests(TestCase):
    """Test WebAuthn credential deletion."""
    
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
        
        self.credential = WebAuthnCredential.objects.create(
            user=self.user,
            credential_id=b'test123',
            public_key=b'pubkey123',
            sign_count=0,
            name='Test Key'
        )
    
    def test_delete_own_credential(self):
        """Test user can delete their own credential."""
        response = self.client.delete(f'/api/auth/webauthn/credentials/{self.credential.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(WebAuthnCredential.objects.filter(id=self.credential.id).exists())
    
    def test_delete_nonexistent_credential(self):
        """Test deleting nonexistent credential returns 404."""
        response = self.client.delete('/api/auth/webauthn/credentials/99999/')
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_delete_other_users_credential(self):
        """Test user cannot delete another user's credential."""
        other_user = User.objects.create_user(
            username='other',
            email='other@example.com',
            password='pass123'
        )
        
        other_credential = WebAuthnCredential.objects.create(
            user=other_user,
            credential_id=b'otherkey',
            public_key=b'pubkey',
            sign_count=0,
            name='Other Key'
        )
        
        response = self.client.delete(f'/api/auth/webauthn/credentials/{other_credential.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        # Credential should still exist
        self.assertTrue(WebAuthnCredential.objects.filter(id=other_credential.id).exists())
    
    def test_delete_requires_authentication(self):
        """Test deletion requires authentication."""
        self.client.force_authenticate(user=None)
        response = self.client.delete(f'/api/auth/webauthn/credentials/{self.credential.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class WebAuthnRegistrationBeginTests(TestCase):
    """Test WebAuthn registration begin endpoint."""
    
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
    
    def test_registration_begin_returns_options(self):
        """Test registration begin returns options."""
        response = self.client.post('/api/auth/webauthn/register/begin/', {'name': 'Test Key'})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('options', response.data)
    
    def test_registration_begin_creates_challenge(self):
        """Test registration begin creates challenge."""
        response = self.client.post('/api/auth/webauthn/register/begin/', {'name': 'Test Key'})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        challenge = WebAuthnChallenge.objects.filter(
            user=self.user,
            is_registration=True
        ).first()
        self.assertIsNotNone(challenge)
    
    def test_registration_begin_deletes_old_challenges(self):
        """Test registration begin deletes old challenges."""
        # Create old challenge
        old_challenge = WebAuthnChallenge.objects.create(
            user=self.user,
            challenge=b'oldchallenge',
            session_key=f'user_{self.user.id}',
            is_registration=True
        )
        
        response = self.client.post('/api/auth/webauthn/register/begin/', {'name': 'Test Key'})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Old challenge should be deleted
        self.assertFalse(WebAuthnChallenge.objects.filter(id=old_challenge.id).exists())
    
    def test_registration_begin_requires_authentication(self):
        """Test registration begin requires authentication."""
        self.client.force_authenticate(user=None)
        response = self.client.post('/api/auth/webauthn/register/begin/', {'name': 'Test Key'})
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class WebAuthnChallengeModelTests(TestCase):
    """Test WebAuthn challenge model."""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
    
    def test_challenge_string_representation(self):
        """Test challenge string representation."""
        challenge = WebAuthnChallenge.objects.create(
            user=self.user,
            challenge=b'testchallenge',
            session_key='session123',
            is_registration=True
        )
        
        expected = f"Registration challenge for {self.user.username}"
        self.assertEqual(str(challenge), expected)
    
    def test_is_expired_returns_false_for_new_challenge(self):
        """Test is_expired returns False for new challenge."""
        challenge = WebAuthnChallenge.objects.create(
            user=self.user,
            challenge=b'testchallenge',
            session_key='session123',
            is_registration=True
        )
        
        self.assertFalse(challenge.is_expired())


class WebAuthnCredentialModelTests(TestCase):
    """Test WebAuthn credential model."""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
    
    def test_credential_string_representation(self):
        """Test credential string representation."""
        credential = WebAuthnCredential.objects.create(
            user=self.user,
            credential_id=b'test123',
            public_key=b'pubkey123',
            sign_count=0,
            name='My Security Key'
        )
        
        expected = f"{self.user.username} - My Security Key"
        self.assertEqual(str(credential), expected)
    
    def test_credential_ordering(self):
        """Test credentials are ordered by creation date."""
        cred1 = WebAuthnCredential.objects.create(
            user=self.user,
            credential_id=b'test1',
            public_key=b'pubkey1',
            sign_count=0,
            name='Key 1'
        )
        cred2 = WebAuthnCredential.objects.create(
            user=self.user,
            credential_id=b'test2',
            public_key=b'pubkey2',
            sign_count=0,
            name='Key 2'
        )
        
        credentials = list(WebAuthnCredential.objects.filter(user=self.user))
        # Should be ordered by -created_at (newest first)
        self.assertEqual(credentials[0].name, 'Key 2')
        self.assertEqual(credentials[1].name, 'Key 1')
