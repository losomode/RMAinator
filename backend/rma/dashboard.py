from django.db.models import Count, Avg, F, ExpressionWrapper, DurationField
from django.utils import timezone
from datetime import timedelta
from rest_framework.views import APIView
from rest_framework.response import Response
from users.permissions import IsAdmin
from .models import RMA, RMAStateHistory


class AdminDashboardView(APIView):
    """API endpoint for admin dashboard metrics."""
    permission_classes = (IsAdmin,)

    def get(self, request):
        # Get RMA counts by state
        state_counts = {}
        for state, _ in RMA.State.choices:
            count = RMA.objects.filter(state=state).count()
            state_counts[state] = count

        # Get priority breakdown
        priority_counts = {}
        for priority, _ in RMA.Priority.choices:
            count = RMA.objects.filter(state__in=[
                RMA.State.SUBMITTED,
                RMA.State.APPROVED,
                RMA.State.RECEIVED,
                RMA.State.DIAGNOSED,
                RMA.State.REPAIRED,
                RMA.State.REPLACED,
                RMA.State.SHIPPED
            ]).filter(priority=priority).count()
            priority_counts[priority] = count

        # Total counts
        total_rmas = RMA.objects.count()
        active_rmas = RMA.objects.exclude(state__in=[
            RMA.State.COMPLETED,
            RMA.State.REJECTED
        ]).count()
        archived_rmas = RMA.objects.filter(state__in=[
            RMA.State.COMPLETED,
            RMA.State.REJECTED
        ]).count()

        # Calculate average time in each state
        avg_time_per_state = {}
        for state, _ in RMA.State.choices:
            # Get all transitions TO this state
            histories = RMAStateHistory.objects.filter(to_state=state)
            
            if histories.exists():
                # Calculate average duration for this state
                total_duration = timedelta()
                count = 0
                
                for history in histories:
                    # Find the next state change for this RMA
                    next_change = RMAStateHistory.objects.filter(
                        rma=history.rma,
                        changed_at__gt=history.changed_at
                    ).order_by('changed_at').first()
                    
                    if next_change:
                        duration = next_change.changed_at - history.changed_at
                        total_duration += duration
                        count += 1
                
                if count > 0:
                    avg_seconds = total_duration.total_seconds() / count
                    avg_time_per_state[state] = {
                        'hours': round(avg_seconds / 3600, 2),
                        'days': round(avg_seconds / 86400, 2)
                    }
                else:
                    avg_time_per_state[state] = {'hours': 0, 'days': 0}
            else:
                avg_time_per_state[state] = {'hours': 0, 'days': 0}

        # Get recent activity (last 20 state changes)
        recent_activity = []
        recent_histories = RMAStateHistory.objects.select_related(
            'rma', 'changed_by'
        ).order_by('-changed_at')[:20]
        
        for history in recent_histories:
            recent_activity.append({
                'rma_id': history.rma.id,
                'rma_number': history.rma.rma_number,
                'serial_number': history.rma.serial_number,
                'from_state': history.from_state,
                'to_state': history.to_state,
                'changed_by': history.changed_by.username if history.changed_by else 'System',
                'changed_at': history.changed_at,
                'notes': history.notes
            })

        # Get RMAs created in last 7, 30, 90 days
        now = timezone.now()
        rmas_last_7_days = RMA.objects.filter(
            created_at__gte=now - timedelta(days=7)
        ).count()
        rmas_last_30_days = RMA.objects.filter(
            created_at__gte=now - timedelta(days=30)
        ).count()
        rmas_last_90_days = RMA.objects.filter(
            created_at__gte=now - timedelta(days=90)
        ).count()

        # Stale RMAs (in same state for > 7 days)
        # This is a simplified version - full implementation in Phase 4.2
        stale_rmas = []
        active = RMA.objects.exclude(state__in=[
            RMA.State.COMPLETED,
            RMA.State.REJECTED
        ])
        
        for rma in active:
            latest_history = rma.state_history.first()
            if latest_history:
                days_in_state = (now - latest_history.changed_at).days
                if days_in_state > 7:
                    stale_rmas.append({
                        'id': rma.id,
                        'rma_number': rma.rma_number,
                        'serial_number': rma.serial_number,
                        'state': rma.state,
                        'days_in_state': days_in_state,
                        'priority': rma.priority
                    })

        return Response({
            'summary': {
                'total_rmas': total_rmas,
                'active_rmas': active_rmas,
                'archived_rmas': archived_rmas,
                'stale_rmas_count': len(stale_rmas)
            },
            'state_counts': state_counts,
            'priority_counts': priority_counts,
            'avg_time_per_state': avg_time_per_state,
            'recent_activity': recent_activity,
            'trends': {
                'last_7_days': rmas_last_7_days,
                'last_30_days': rmas_last_30_days,
                'last_90_days': rmas_last_90_days
            },
            'stale_rmas': stale_rmas[:10]  # Top 10 stale RMAs
        })
