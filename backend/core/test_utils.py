"""
Test utilities for RMAinator tests.
Provides helpers for creating test users and mocking Authinator authentication.
"""
from users.models import User


# Counter for generating unique usernames
_user_counter = 0

def create_mock_user(is_admin=False, company_id=None, **kwargs):
    """
    Create a test user (Django User model instance) for testing.

    Args:
        is_admin: If True, sets role to 'ADMIN' (role_level=100)
        company_id: Optional company ID to attach as company_id_remote
        **kwargs: Additional user attributes to override

    Returns:
        User model instance with role_level and company_id_remote set
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
    defaults.pop('user_id', None)

    # Extract non-User-model fields
    role = defaults.pop('role', 'USER')
    defaults.pop('customer_id', None)
    defaults.pop('customer_name', None)
    defaults.pop('is_verified', None)
    defaults.pop('is_active', None)
    defaults.pop('company_id', None)  # not a DB field

    # Create User model instance
    user = User.objects.create(**defaults)

    # Set permission-related instance attributes (not DB-persisted)
    if role == 'ADMIN':
        user.is_staff = True
        user.is_admin = True
        user.role_level = 100  # Used by IsAdmin permission class
        user.save(update_fields=['is_staff'])
    else:
        user.is_admin = False
        user.role_level = 10  # Non-admin, non-zero so scoping logic still applies

    # Attach company info (mirrors _attach_authinator_attrs in production)
    user.company_id_remote = company_id
    user.customer_id_remote = company_id

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
        user: users.User model instance (with is_admin attribute)
    """
    client.force_authenticate(user=user)
