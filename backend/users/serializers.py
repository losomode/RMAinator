from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import User


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for user registration."""
    password = serializers.CharField(
        write_only=True, required=True, validators=[validate_password]
    )
    password2 = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ('username', 'password', 'password2', 'email', 'first_name', 'last_name')
        extra_kwargs = {
            'first_name': {'required': True},
            'last_name': {'required': True},
            'email': {'required': True}
        }

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError(
                {"password": "Password fields didn't match."}
            )
        return attrs

    def create(self, validated_data):
        validated_data.pop('password2')
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            password=validated_data['password'],
            is_verified=False,  # Requires admin approval
            role=User.Role.USER
        )
        return user


class UserSerializer(serializers.ModelSerializer):
    """Serializer for user details."""
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 
                  'role', 'is_verified', 'date_joined')
        read_only_fields = ('id', 'role', 'is_verified', 'date_joined')


class UserUpdateSerializer(serializers.ModelSerializer):
    """Serializer for user profile updates."""
    current_password = serializers.CharField(write_only=True, required=False)
    new_password = serializers.CharField(
        write_only=True, required=False, validators=[validate_password]
    )
    new_password2 = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = ('email', 'first_name', 'last_name', 
                  'current_password', 'new_password', 'new_password2')

    def validate(self, attrs):
        # If changing password, require current password and matching new passwords
        if 'new_password' in attrs or 'new_password2' in attrs:
            if not attrs.get('current_password'):
                raise serializers.ValidationError({
                    "current_password": "Current password is required to change password."
                })
            if attrs.get('new_password') != attrs.get('new_password2'):
                raise serializers.ValidationError({
                    "new_password": "New password fields didn't match."
                })
        return attrs

    def validate_current_password(self, value):
        user = self.instance
        if not user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect.")
        return value

    def update(self, instance, validated_data):
        # Remove password-related fields from validated_data
        validated_data.pop('current_password', None)
        new_password = validated_data.pop('new_password', None)
        validated_data.pop('new_password2', None)

        # Update user fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        # Update password if provided
        if new_password:
            instance.set_password(new_password)

        instance.save()
        return instance


class UserApprovalSerializer(serializers.Serializer):
    """Serializer for approving/rejecting users."""
    approve = serializers.BooleanField(required=True)
