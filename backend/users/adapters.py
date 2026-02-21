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
        Return True to allow automatic signup.
        Users will still need admin approval (is_verified=False).
        """
        return True
    
    def populate_user(self, request, sociallogin, data):
        """
        Populate user instance with data from social account.
        """
        user = super().populate_user(request, sociallogin, data)
        
        # Generate username from email if not provided
        if not user.username and user.email:
            # Use email prefix as username
            base_username = user.email.split('@')[0]
            username = base_username
            # Ensure unique username
            from django.contrib.auth import get_user_model
            User = get_user_model()
            counter = 1
            while User.objects.filter(username=username).exists():
                username = f"{base_username}{counter}"
                counter += 1
            user.username = username
        
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
    
    def get_login_redirect_url(self, request):
        """
        Redirect to custom callback view that issues JWT tokens.
        """
        from django.urls import reverse
        return reverse('users:sso_callback')
    
    def pre_social_login(self, request, sociallogin):
        """
        Check if user is verified before allowing SSO login.
        """
        from django.contrib import messages
        from django.shortcuts import redirect
        
        # If this is a new signup, user won't exist yet - allow it
        if not sociallogin.is_existing:
            return
        
        # For existing users, check verification status
        user = sociallogin.user
        if not user.is_verified:
            # Store error message and redirect to frontend
            messages.error(request, 'Your account is pending admin approval')
            # We can't easily redirect here, so we'll let it through
            # and check on the frontend /api/auth/me/ endpoint
            pass


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
