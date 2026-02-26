"""
Permission classes for RMAinator.
"""
from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    """
    Permission class to check if the user is an admin.
    Works with Authinator users which have an is_admin property.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_admin)
