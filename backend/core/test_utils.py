"""
Test utilities for RMAinator tests.
Provides helpers for creating test users and mocking Authinator authentication.
"""
from unittest.mock import Mock
from core.authentication import AuthinatorUser
from users.models import User


class MockAuthinatorUser(AuthinatorUser):
    """
    Mock Authinator user for testing.
    Can be used directly without needing to mock the Authinator API.
    """
    def __init__(self, user_id=1, username='testuser', email='test@example.com', 
                 role='USER', customer_id=None, customer_name=None,
                 is_verified=True, is_active=True):
        """Initialize a mock user with test data."""
        user_data = {
            'id': user_id,
            'username': username,
            'email': email,
            'role': role,
            'customer_id': customer_id,
            'customer_name': customer_name,
            'is_verified': is_verified,
            'is_active': is_active,
        }
        super().__init__(user_data)


# Counter for generating unique usernames
_user_counter = 0

def create_mock_user(is_admin=False, **kwargs):
    """
    Create a test user (Django User model instance) for testing.
    
    Args:
        is_admin: If True, sets role to 'ADMIN'
        **kwargs: Additional user attributes to override
        
    Returns:
        User model instance
    """
    global _user_counter
    _user_counter += 1
    
    defaults = {
        'user_id': None,  # Let Django auto-assign
        'username': f'testuser{_user_counter}',
        'email': f'test{_user_counter}@example.com',
        'role': 'ADMIN' if is_admin else 'USER',
    }
    defaults.update(kwargs)
    
    # Remove user_id if present since we'll use Django's auto ID
    user_id = defaults.pop('user_id', None)
    
    # Extract non-User-model fields
    role = defaults.pop('role', 'USER')
    defaults.pop('customer_id', None)
    defaults.pop('customer_name', None)
    defaults.pop('is_verified', None)
    defaults.pop('is_active', None)
    
    # Create User model instance
    # Note: Don't use get_or_create with explicit ID as it may cause conflicts
    user = User.objects.create(**defaults)
    
    # Mark admins with Django's is_staff flag
    if role in ['ADMIN', 'SYSTEM_ADMIN', 'CUSTOMER_ADMIN']:
        user.is_staff = True
        user.is_admin = True  # Custom attribute for compatibility
        user.save()
    else:
        user.is_admin = False
    
    # Store role as an attribute for test compatibility
    user._test_role = role
    
    return user


def create_mock_admin(**kwargs):
    """Create a mock admin user."""
    return create_mock_user(is_admin=True, **kwargs)


def authenticate_user(client, user):
    """
    Authenticate a test client with a mock user.
    Sets the user directly on the client for testing.
    
    Args:
        client: Django test client or DRF APIClient
        user: MockAuthinatorUser instance
    """
    # Store user for the test client to use
    client.force_authenticate(user=user)
