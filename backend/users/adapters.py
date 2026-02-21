"""
Custom adapters for django-allauth to integrate with RMAinator's user approval workflow.
"""
from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from allauth.account.adapter import DefaultAccountAdapter


class CustomSocialAccountAdapter(DefaultSocialAccountAdapter):
    """
    Custom adapter for social account (SSO) signups.
    Ensures new users from SSO require admin approval.
    """
    
    def is_auto_signup_allowed(self, request, sociallogin):
        """
        Return False to prevent automatic signup.
        Users will need to go through approval process.
        """
        return False
    
    def populate_user(self, request, sociallogin, data):
        """
        Populate user instance with data from social account.
        """
        user = super().populate_user(request, sociallogin, data)
        
        # Set default role and verification status
        user.role = 'USER'
        user.is_verified = False  # Require admin approval
        
        # Get additional data from social account
        if 'first_name' in data:
            user.first_name = data['first_name']
        if 'last_name' in data:
            user.last_name = data['last_name']
        if 'email' in data:
            user.email = data['email']
            
        return user
    
    def save_user(self, request, sociallogin, form=None):
        """
        Save the user and send notification to admins.
        """
        user = super().save_user(request, sociallogin, form)
        
        # Send notification to admins about new SSO user
        # (This will be picked up by existing notification system)
        user._just_registered = True
        
        return user


class CustomAccountAdapter(DefaultAccountAdapter):
    """
    Custom adapter for regular account operations.
    """
    
    def save_user(self, request, user, form, commit=True):
        """
        Save user from signup form.
        """
        user = super().save_user(request, user, form, commit=False)
        
        # Ensure new signups require approval
        user.role = 'USER'
        user.is_verified = False
        
        if commit:
            user.save()
        
        return user
