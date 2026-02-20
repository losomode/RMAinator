"""
Management command to check for stale RMAs and send notifications.

Run this command periodically (e.g., via cron) to detect RMAs that have
been in the same state for too long based on configured timeout thresholds.
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db.models import Q
from datetime import timedelta
from rma.models import RMA
from notifications.models import StateTimeout, StaleRMARecord
from notifications.utils import send_stale_rma_notification_to_admins


class Command(BaseCommand):
    help = 'Check for stale RMAs and send notifications'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be done without actually doing it',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN MODE - No changes will be made'))
        
        # Get all timeout configurations
        timeouts = StateTimeout.objects.all()
        
        if not timeouts.exists():
            self.stdout.write(self.style.WARNING(
                'No timeout configurations found. Please create StateTimeout records in admin.'
            ))
            return
        
        stale_count = 0
        notification_count = 0
        
        # Check each active RMA
        active_rmas = RMA.objects.filter(
            state__in=[
                RMA.State.SUBMITTED,
                RMA.State.APPROVED,
                RMA.State.RECEIVED,
                RMA.State.DIAGNOSED,
                RMA.State.REPAIRED,
                RMA.State.REPLACED,
                RMA.State.SHIPPED,
            ]
        ).select_related('owner')
        
        for rma in active_rmas:
            # Get the most recent state history for this RMA
            latest_history = rma.state_history.filter(to_state=rma.state).first()
            
            if not latest_history:
                continue
            
            # Get timeout for this RMA's state and priority
            try:
                timeout_config = timeouts.get(
                    state=rma.state,
                    priority=rma.priority
                )
            except StateTimeout.DoesNotExist:
                # No timeout configured for this state/priority combo
                continue
            
            # Calculate time in current state
            time_in_state = timezone.now() - latest_history.changed_at
            timeout_threshold = timedelta(hours=timeout_config.timeout_hours)
            
            if time_in_state > timeout_threshold:
                # RMA is stale!
                self.stdout.write(
                    f'STALE: RMA #{rma.rma_number} in {rma.state} for '
                    f'{time_in_state.total_seconds() / 3600:.1f}h '
                    f'(threshold: {timeout_config.timeout_hours}h)'
                )
                stale_count += 1
                
                if not dry_run:
                    # Check if already marked as stale for current state
                    existing_record = StaleRMARecord.objects.filter(
                        rma=rma,
                        state=rma.state,
                        resolved=False
                    ).first()
                    
                    if existing_record:
                        # Already marked stale, check if notification sent
                        if not existing_record.notification_sent:
                            send_stale_rma_notification_to_admins(rma, time_in_state, timeout_config)
                            existing_record.notification_sent = True
                            existing_record.save()
                            notification_count += 1
                            self.stdout.write(self.style.SUCCESS(
                                f'  → Sent notification for RMA #{rma.rma_number}'
                            ))
                    else:
                        # Create new stale record and send notification
                        StaleRMARecord.objects.create(
                            rma=rma,
                            state=rma.state,
                            notification_sent=True
                        )
                        send_stale_rma_notification_to_admins(rma, time_in_state, timeout_config)
                        notification_count += 1
                        self.stdout.write(self.style.SUCCESS(
                            f'  → Marked stale and sent notification for RMA #{rma.rma_number}'
                        ))
            else:
                # RMA is not stale, resolve any existing stale records for current state
                if not dry_run:
                    StaleRMARecord.objects.filter(
                        rma=rma,
                        state=rma.state,
                        resolved=False
                    ).update(resolved=True)
        
        # Summary
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(
            f'Checked {active_rmas.count()} active RMAs'
        ))
        self.stdout.write(self.style.WARNING(
            f'Found {stale_count} stale RMAs'
        ))
        if not dry_run:
            self.stdout.write(self.style.SUCCESS(
                f'Sent {notification_count} notifications'
            ))
