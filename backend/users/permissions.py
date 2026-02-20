from rest_framework import permissions


class IsAdmin(permissions.BasePermission):
    """Permission class for admin users only."""
    
    def has_permission(self, request, view):
        return (request.user and 
                request.user.is_authenticated and 
                request.user.role == 'ADMIN')


class IsVerifiedUser(permissions.BasePermission):
    """Permission class for verified users."""
    
    def has_permission(self, request, view):
        return (request.user and 
                request.user.is_authenticated and 
                request.user.is_verified)


class IsAdminOrVerifiedUser(permissions.BasePermission):
    """Permission class for admin or verified users."""
    
    def has_permission(self, request, view):
        return (request.user and 
                request.user.is_authenticated and 
                (request.user.role == 'ADMIN' or request.user.is_verified))
