"""
TOTP/2FA API endpoints for setup and verification.
"""
import io
import qrcode
import base64
from django.conf import settings
from django_otp.plugins.otp_totp.models import TOTPDevice
from rest_framework import status, views
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated


class TOTPSetupView(views.APIView):
    """
    Initialize TOTP setup for a user.
    Returns QR code and secret for authenticator app.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        user = request.user
        
        # Check if user already has TOTP enabled
        existing_device = TOTPDevice.objects.filter(user=user, confirmed=True).first()
        if existing_device:
            return Response(
                {'error': 'Two-factor authentication is already enabled'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Delete any unconfirmed devices
        TOTPDevice.objects.filter(user=user, confirmed=False).delete()
        
        # Create new TOTP device
        device = TOTPDevice.objects.create(
            user=user,
            name='default',
            confirmed=False,
        )
        
        # Generate provisioning URI for QR code
        provisioning_uri = device.config_url
        
        # Generate QR code
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(provisioning_uri)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Convert to base64
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        qr_code_base64 = base64.b64encode(buffer.getvalue()).decode()
        qr_code_data_uri = f"data:image/png;base64,{qr_code_base64}"
        
        return Response({
            'qr_code': qr_code_data_uri,
            'secret': device.key,
            'message': 'Scan the QR code with your authenticator app',
        })


class TOTPConfirmView(views.APIView):
    """
    Confirm TOTP setup by verifying a token.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        user = request.user
        token = request.data.get('token')
        
        if not token:
            return Response(
                {'error': 'Token is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get unconfirmed device
        try:
            device = TOTPDevice.objects.get(user=user, confirmed=False)
        except TOTPDevice.DoesNotExist:
            return Response(
                {'error': 'No pending TOTP setup found. Please start setup again.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verify token
        if device.verify_token(token):
            device.confirmed = True
            device.save()
            
            return Response({
                'success': True,
                'message': 'Two-factor authentication enabled successfully',
            })
        else:
            return Response(
                {'error': 'Invalid verification code. Please try again.'},
                status=status.HTTP_400_BAD_REQUEST
            )


class TOTPDisableView(views.APIView):
    """
    Disable TOTP for a user.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        user = request.user
        token = request.data.get('token')
        
        if not token:
            return Response(
                {'error': 'Token is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get confirmed device
        try:
            device = TOTPDevice.objects.get(user=user, confirmed=True)
        except TOTPDevice.DoesNotExist:
            return Response(
                {'error': 'Two-factor authentication is not enabled'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verify token before disabling
        if device.verify_token(token):
            device.delete()
            
            return Response({
                'success': True,
                'message': 'Two-factor authentication disabled successfully',
            })
        else:
            return Response(
                {'error': 'Invalid verification code'},
                status=status.HTTP_400_BAD_REQUEST
            )


class TOTPStatusView(views.APIView):
    """
    Check if TOTP is enabled for a user.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        device = TOTPDevice.objects.filter(user=user, confirmed=True).first()
        
        return Response({
            'enabled': device is not None,
            'device_name': device.name if device else None,
        })
