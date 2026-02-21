"""
WebAuthn API endpoints for registration and authentication.
"""
import os
import base64
from django.conf import settings
from rest_framework import status, views
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from webauthn import (
    generate_registration_options,
    verify_registration_response,
    generate_authentication_options,
    verify_authentication_response,
    options_to_json,
)
from webauthn.helpers.structs import (
    PublicKeyCredentialDescriptor,
    AuthenticatorTransport,
)
from webauthn.helpers.cose import COSEAlgorithmIdentifier

from .models import WebAuthnCredential, WebAuthnChallenge
from users.models import User
from users.serializers import UserSerializer


RP_ID = os.environ.get('WEBAUTHN_RP_ID', 'localhost')
RP_NAME = os.environ.get('WEBAUTHN_RP_NAME', 'RMAinator')
ORIGIN = os.environ.get('WEBAUTHN_ORIGIN', 'http://localhost:5173')


class WebAuthnRegistrationBeginView(views.APIView):
    """
    Start WebAuthn registration process.
    Returns registration options including challenge.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        user = request.user
        
        # Get existing credentials for this user
        existing_credentials = [
            PublicKeyCredentialDescriptor(
                id=cred.credential_id,
                transports=[AuthenticatorTransport(t) for t in cred.transports] if cred.transports else None
            )
            for cred in user.webauthn_credentials.all()
        ]
        
        # Generate registration options
        options = generate_registration_options(
            rp_id=RP_ID,
            rp_name=RP_NAME,
            user_id=str(user.id).encode('utf-8'),
            user_name=user.username,
            user_display_name=f"{user.first_name} {user.last_name}" if user.first_name else user.username,
            exclude_credentials=existing_credentials,
            authenticator_selection={
                "residentKey": "preferred",
                "userVerification": "preferred",
            },
            supported_pub_key_algs=[
                COSEAlgorithmIdentifier.ECDSA_SHA_256,
                COSEAlgorithmIdentifier.RSASSA_PKCS1_v1_5_SHA_256,
            ],
        )
        
        # Store challenge
        session_key = request.session.session_key or request.session.create()
        WebAuthnChallenge.objects.create(
            user=user,
            challenge=options.challenge,
            session_key=session_key,
            is_registration=True,
        )
        
        return Response({
            'options': options_to_json(options),
        })


class WebAuthnRegistrationCompleteView(views.APIView):
    """
    Complete WebAuthn registration.
    Verifies the credential and stores it.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        user = request.user
        credential_data = request.data.get('credential')
        credential_name = request.data.get('name', 'Security Key')
        
        if not credential_data:
            return Response(
                {'error': 'No credential data provided'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get challenge
        session_key = request.session.session_key
        try:
            challenge_obj = WebAuthnChallenge.objects.get(
                user=user,
                session_key=session_key,
                is_registration=True,
            )
            
            if challenge_obj.is_expired():
                challenge_obj.delete()
                return Response(
                    {'error': 'Challenge expired'},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            expected_challenge = challenge_obj.challenge
        except WebAuthnChallenge.DoesNotExist:
            return Response(
                {'error': 'No challenge found'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Verify registration response
            verification = verify_registration_response(
                credential=credential_data,
                expected_challenge=expected_challenge,
                expected_rp_id=RP_ID,
                expected_origin=ORIGIN,
            )
            
            # Store credential
            WebAuthnCredential.objects.create(
                user=user,
                credential_id=verification.credential_id,
                public_key=verification.credential_public_key,
                sign_count=verification.sign_count,
                name=credential_name,
                aaguid=verification.aaguid,
                transports=credential_data.get('transports', []),
            )
            
            # Delete used challenge
            challenge_obj.delete()
            
            return Response({
                'success': True,
                'message': 'Security key registered successfully',
            })
            
        except Exception as e:
            return Response(
                {'error': f'Registration failed: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )


class WebAuthnCredentialListView(views.APIView):
    """
    List user's WebAuthn credentials.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        credentials = request.user.webauthn_credentials.all()
        
        return Response({
            'credentials': [
                {
                    'id': cred.id,
                    'name': cred.name,
                    'created_at': cred.created_at,
                    'last_used': cred.last_used,
                    'transports': cred.transports,
                }
                for cred in credentials
            ]
        })


class WebAuthnCredentialDeleteView(views.APIView):
    """
    Delete a WebAuthn credential.
    """
    permission_classes = [IsAuthenticated]
    
    def delete(self, request, credential_id):
        try:
            credential = request.user.webauthn_credentials.get(id=credential_id)
            credential.delete()
            
            return Response({
                'success': True,
                'message': 'Security key removed successfully',
            })
        except WebAuthnCredential.DoesNotExist:
            return Response(
                {'error': 'Credential not found'},
                status=status.HTTP_404_NOT_FOUND
            )
