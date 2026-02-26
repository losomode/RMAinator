"""
Serializers for core app.
"""
from rest_framework import serializers


class UserSerializer(serializers.Serializer):
    """
    Serializer for Authinator users.
    Since users are not Django models, this is a simple Serializer (not ModelSerializer).
    """
    id = serializers.IntegerField(read_only=True)
    username = serializers.CharField(read_only=True)
    email = serializers.EmailField(read_only=True)
    role = serializers.CharField(read_only=True)
    customer_id = serializers.IntegerField(read_only=True, allow_null=True)
    customer_name = serializers.CharField(read_only=True, allow_null=True)
    is_verified = serializers.BooleanField(read_only=True)
    is_active = serializers.BooleanField(read_only=True)
    is_admin = serializers.BooleanField(read_only=True)
