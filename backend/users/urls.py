from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    UserRegistrationView,
    UserLoginView,
    CurrentUserView,
    PendingUsersListView,
    UserApprovalView
)
from .totp_views import (
    TOTPSetupView,
    TOTPConfirmView,
    TOTPDisableView,
    TOTPStatusView,
)

app_name = 'users'

urlpatterns = [
    # Auth endpoints
    path('register/', UserRegistrationView.as_view(), name='register'),
    path('login/', UserLoginView.as_view(), name='login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', CurrentUserView.as_view(), name='current_user'),
    
    # Admin user management endpoints
    path('pending/', PendingUsersListView.as_view(), name='pending_users'),
    path('<int:user_id>/approve/', UserApprovalView.as_view(), name='user_approval'),
    
    # TOTP/2FA endpoints
    path('totp/setup/', TOTPSetupView.as_view(), name='totp_setup'),
    path('totp/confirm/', TOTPConfirmView.as_view(), name='totp_confirm'),
    path('totp/disable/', TOTPDisableView.as_view(), name='totp_disable'),
    path('totp/status/', TOTPStatusView.as_view(), name='totp_status'),
]
