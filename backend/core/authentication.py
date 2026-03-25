"""
Custom authentication classes for RMAinator.

Authenticates requests by validating JWT tokens with Authinator.
"""
import logging

from rest_framework import authentication
from rest_framework import exceptions
from core.authinator_client import authinator_client
from core.userinator_client import userinator_client

logger = logging.getLogger(__name__)


def _get_or_create_local_user(user_data):
    """
    Get or create a local users.User record for FK relations.

    The local User model is a stub that exists only so that
    RMAStateHistory.changed_by, AuditLog.user, etc. can use real
    ForeignKey references.  We sync minimal fields from Authinator.
    """
    from users.models import User  # late import to avoid circular deps

    authinator_id = user_data['id']
    defaults = {
        'username': user_data['username'],
        'email': user_data.get('email', ''),
    }

    user, created = User.objects.get_or_create(
        id=authinator_id,
        defaults=defaults,
    )

    # Keep username / email in sync on subsequent logins
    if not created:
        changed = False
        for field, value in defaults.items():
            if getattr(user, field) != value:
                setattr(user, field, value)
                changed = True
        if changed:
            user.save(update_fields=list(defaults.keys()))

    return user


def _attach_authinator_attrs(user, user_data, context_data=None):
    """
    Attach Authinator role / permission helpers directly onto the
    local User model instance so permission classes and views can
    use them without changes.

    If context_data from USERinator is available, use role_level and
    company_id from there (authoritative source). Otherwise fall back
    to legacy data from AUTHinator.
    """
    if context_data:
        # Use USERinator context as authoritative source
        role_level = context_data.get('role_level', 0)
        role = context_data.get('role_name', '')
        company_id = context_data.get('company_id')
        company_name = context_data.get('company_name')
    else:
        # Fallback to AUTHinator data (legacy)
        role = user_data.get('role', '')
        role_level = user_data.get('role_level', 0)
        company_id = user_data.get('customer_id')
        company_name = user_data.get('customer_name')
    
    user.role = role
    user.role_level = role_level
    user.company_id_remote = company_id  # USERinator uses company_id
    user.customer_id_remote = company_id  # Legacy alias
    user.customer_name = company_name
    user.is_verified = user_data.get('is_verified', False)
    # Use role_level when it carries a meaningful value (>0); fall back to role string
    # role_level defaults to 0 when absent from the token, so treat 0 as "not provided"
    user.is_admin = role_level >= 100 if role_level else role == 'ADMIN'

    # Attach helper methods (legacy aliases)
    user.is_system_admin = lambda: user.is_admin
    user.is_customer_admin = lambda: user.is_admin
    user.can_manage_users = lambda: user.is_admin


class AuthinatorJWTAuthentication(authentication.BaseAuthentication):
    """
    Custom authentication class that validates JWT tokens with Authinator.

    This authentication class:
    1. Extracts the JWT token from the Authorization header
    2. Validates the token with Authinator API
    3. Returns a local users.User model instance (for FK compatibility)
       augmented with Authinator role / permission attributes
    """

    def authenticate(self, request):
        """
        Authenticate the request and return a two-tuple of (user, token).
        """
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')

        if not auth_header:
            return None

        # Parse Bearer token
        parts = auth_header.split()

        if len(parts) != 2 or parts[0].lower() != 'bearer':
            raise exceptions.AuthenticationFailed('Invalid authorization header format')

        token = parts[1]

        # Validate token with Authinator
        user_data = authinator_client.get_user_from_token(token)

        if user_data is None:
            raise exceptions.AuthenticationFailed('Invalid or expired token')

        if not user_data.get('is_active', True):
            raise exceptions.AuthenticationFailed('User account is not active')

        # Resolve a real DB user for ForeignKey relations
        user = _get_or_create_local_user(user_data)
        
        # Fetch full context from USERinator (role_level, company, permissions)
        user_id = user_data.get('id')
        context_data = None
        if user_id:
            context_data = userinator_client.get_user_context(user_id, token)
            if not context_data:
                logger.warning(
                    f'Failed to fetch USERinator context for user {user_id}, '
                    'falling back to AUTHinator data'
                )
        
        _attach_authinator_attrs(user, user_data, context_data)

        return (user, token)
