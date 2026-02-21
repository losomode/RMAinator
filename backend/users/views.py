from rest_framework import generics, status, views
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from .models import User
from .serializers import (
    UserRegistrationSerializer, 
    UserSerializer,
    UserUpdateSerializer,
    UserApprovalSerializer
)
from .permissions import IsAdmin


class UserRegistrationView(generics.CreateAPIView):
    """API endpoint for user registration."""
    queryset = User.objects.all()
    permission_classes = (AllowAny,)
    serializer_class = UserRegistrationSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response({
            'message': 'User created successfully. Please wait for admin approval.',
            'user': UserSerializer(user).data
        }, status=status.HTTP_201_CREATED)


class UserLoginView(views.APIView):
    """API endpoint for user login."""
    permission_classes = (AllowAny,)

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')

        if not username or not password:
            return Response({
                'error': 'Please provide both username and password'
            }, status=status.HTTP_400_BAD_REQUEST)

        user = authenticate(username=username, password=password)

        if not user:
            return Response({
                'error': 'Invalid credentials'
            }, status=status.HTTP_401_UNAUTHORIZED)

        if not user.is_verified:
            return Response({
                'error': 'Your account is pending admin approval'
            }, status=status.HTTP_403_FORBIDDEN)

        refresh = RefreshToken.for_user(user)
        
        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user': UserSerializer(user).data
        })


class CurrentUserView(generics.RetrieveUpdateAPIView):
    """API endpoint to get and update current user details."""
    permission_classes = (IsAuthenticated,)

    def get_object(self):
        return self.request.user
    
    def retrieve(self, request, *args, **kwargs):
        """Override retrieve to check verification status."""
        instance = self.get_object()
        
        # Check if user is verified
        if not instance.is_verified:
            return Response({
                'error': 'Your account is pending admin approval. Please contact your RMAinator administrator to enable your account.',
                'user': UserSerializer(instance).data
            }, status=status.HTTP_403_FORBIDDEN)
        
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return UserUpdateSerializer
        return UserSerializer

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        # Update user in storage after profile update
        updated_user = UserSerializer(instance).data
        return Response({
            'message': 'Profile updated successfully',
            'user': updated_user
        })


class PendingUsersListView(generics.ListAPIView):
    """API endpoint to list pending user approvals (admin only)."""
    permission_classes = (IsAdmin,)
    serializer_class = UserSerializer

    def get_queryset(self):
        return User.objects.filter(is_verified=False, role=User.Role.USER)


class UserApprovalView(views.APIView):
    """API endpoint to approve or reject users (admin only)."""
    permission_classes = (IsAdmin,)

    def post(self, request, user_id):
        try:
            user = User.objects.get(id=user_id, role=User.Role.USER)
        except User.DoesNotExist:
            return Response({
                'error': 'User not found'
            }, status=status.HTTP_404_NOT_FOUND)

        serializer = UserApprovalSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if serializer.validated_data['approve']:
            user.is_verified = True
            user._just_verified = True  # Flag for signal to send approval email
            user.save()
            return Response({
                'message': f'User {user.username} approved successfully',
                'user': UserSerializer(user).data
            })
        else:
            user.delete()
            return Response({
                'message': f'User {user.username} rejected and deleted'
            })
