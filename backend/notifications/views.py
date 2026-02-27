from rest_framework import viewsets
from core.permissions import IsAdmin
from .models import StateTimeout
from .serializers import StateTimeoutSerializer


class StateTimeoutViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing StateTimeout configurations.
    
    Allows admins to configure timeout thresholds for each RMA state and priority combination.
    """
    permission_classes = (IsAdmin,)
    queryset = StateTimeout.objects.all()
    serializer_class = StateTimeoutSerializer
    pagination_class = None  # Return all configs at once
