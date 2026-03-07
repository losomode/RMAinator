"""
Permission classes for RMAinator.
"""
from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    """
    Permission class to check if the user is an admin (role_level >= 100).
    Uses role_level from USERinator context.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        role_level = getattr(request.user, 'role_level', 0)
        return role_level >= 100


class AdminOnly(BasePermission):
    """Alias for IsAdmin - requires ADMIN role (level 100)."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        role_level = getattr(request.user, 'role_level', 0)
        return role_level >= 100
