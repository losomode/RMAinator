"""
Views to handle SSO callbacks and issue JWT tokens.
"""
from django.shortcuts import redirect
from django.contrib.auth import login
from allauth.socialaccount.signals import pre_social_login
from django.dispatch import receiver
from rest_framework_simplejwt.tokens import RefreshToken
from urllib.parse import urlencode


@receiver(pre_social_login)
def link_to_local_user(sender, request, sociallogin, **kwargs):
    """
    Signal handler to link social account to local user if email matches.
    """
    email = sociallogin.account.extra_data.get('email')
    if email:
        from users.models import User
        try:
            user = User.objects.get(email=email)
            # Link the social account to existing user
            sociallogin.connect(request, user)
        except User.DoesNotExist:
            pass


def sso_callback_view(request):
    """
    Custom callback view that generates JWT tokens and redirects to frontend.
    This is called after successful OAuth authentication.
    """
    from django.contrib.auth import logout
    
    user = request.user
    
    if user.is_authenticated:
        # Store user info before logging out
        is_verified = user.is_verified
        
        # Check if user is verified
        if not is_verified:
            # Generate tokens but don't allow login
            # Clear the session immediately
            request.session.flush()
            
            # Redirect to frontend with error
            params = urlencode({
                'error': 'pending_approval',
                'message': 'Your account has been created but requires admin approval. Please contact your RMAinator administrator.'
            })
            response = redirect(f'http://localhost:5173/auth/callback?{params}')
            # Delete the session cookie
            response.delete_cookie('sessionid')
            return response
        
        # Generate JWT tokens for verified users
        refresh = RefreshToken.for_user(user)
        
        # Clear the SSO session immediately after generating tokens
        # This prevents SSO login from overwriting admin sessions
        request.session.flush()
        
        # Redirect to frontend with tokens
        params = urlencode({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        })
        response = redirect(f'http://localhost:5173/auth/callback?{params}')
        # Delete the session cookie so SSO doesn't interfere with admin
        response.delete_cookie('sessionid')
        return response
    else:
        # Authentication failed
        params = urlencode({
            'error': 'authentication_failed',
            'message': 'SSO authentication failed'
        })
        return redirect(f'http://localhost:5173/auth/callback?{params}')
