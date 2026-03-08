"""
Management command to populate RMAinator with demo data.

Creates local user stubs (matching Authinator demo users) and RMAs across
various states with realistic state history. Serial numbers reference devices
from Fulfilinator deliveries.

Idempotent — safe to run multiple times.
"""
from datetime import timedelta

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

from rma.models import RMA, RMAGroup, RMAStateHistory

User = get_user_model()


def dt_days_ago(n):
    return timezone.now() - timedelta(days=n)


# ── User stubs (must match Authinator/USERinator seed_demo IDs) ──
USER_STUBS = [
    # (id, username, email, company_id)  — IDs must match Authinator
    (1, 'admin', 'admin@example.com', None),  # Platform admin
    (2, 'alice.admin', 'alice@example.com', None),  # Platform admin
    (101, 'bob.manager', 'bob@acme.example.com', 1),  # Acme Corporation
    (102, 'carol.member', 'carol@acme.example.com', 1),  # Acme Corporation
    (103, 'dave.member', 'dave@acme.example.com', 1),  # Acme Corporation
    (104, 'frank.manager', 'frank@globex.example.com', 2),  # Globex Industries
    (105, 'grace.member', 'grace@globex.example.com', 2),  # Globex Industries
    (106, 'henry.manager', 'henry@initech.example.com', 3),  # Initech LLC
    (107, 'iris.member', 'iris@initech.example.com', 3),  # Initech LLC
    (108, 'jack.manager', 'jack@wayne.example.com', 4),  # Wayne Enterprises
    (109, 'kate.member', 'kate@wayne.example.com', 4),  # Wayne Enterprises
    (110, 'leo.member', 'leo@wayne.example.com', 4),  # Wayne Enterprises
]

# ── RMA definitions ──────────────────────────────────────────────
# Serial numbers reference Fulfilinator delivery items.
# States: SUBMITTED → APPROVED → RECEIVED → DIAGNOSED → REPAIRED/REPLACED → SHIPPED → COMPLETED
#         SUBMITTED → REJECTED (terminal)
RMAS = [
    {
        'owner_username': 'bob.manager',  # Acme Corporation
        'serial_number': 'CLR-M-0003',
        'first_ship_date': '2021-06-15',
        'fault_notes': 'Camera LR intermittent video freeze after 30 min of operation. '
                       'IR LEDs also not activating in night mode.',
        'priority': 'HIGH',
        'target_state': 'COMPLETED',
        'root_cause': 'Thermal throttling due to degraded thermal paste on image processor',
        'parts_replaced': 'Thermal paste, IR LED array, main board heatsink',
        'cost_to_repair': '$185.00',
    },
    {
        'owner_username': 'carol.member',  # Acme Corporation
        'serial_number': 'N46-M-0002',
        'first_ship_date': '2024-11-20',
        'fault_notes': 'Node 4.6 crashes under sustained analytics load. '
                       'Kernel panic logs reference memory controller.',
        'priority': 'NORMAL',
        'target_state': 'DIAGNOSED',
        'root_cause': 'Faulty DIMM slot 2 — intermittent contact under thermal expansion',
    },
    {
        'owner_username': 'frank.manager',  # Globex Industries
        'serial_number': 'CSR-A-0004',
        'first_ship_date': '2025-01-10',
        'fault_notes': 'Camera SR producing washed-out image with blue tint. '
                       'Factory reset did not resolve.',
        'priority': 'NORMAL',
        'target_state': 'SUBMITTED',
    },
    {
        'owner_username': 'grace.member',  # Globex Industries
        'serial_number': 'CSR-A-0007',
        'first_ship_date': '2025-01-10',
        'fault_notes': 'Camera SR no video output. Power LED blinks but no stream. '
                       'Tested with multiple cables and PoE switches.',
        'priority': 'HIGH',
        'target_state': 'APPROVED',
    },
    {
        'owner_username': 'henry.manager',  # Initech LLC
        'serial_number': 'CSR-A-0009',
        'first_ship_date': '2025-01-10',
        'fault_notes': 'Wide-angle lens cracked — possibly shipping damage. '
                       'Unit was DOA on unboxing.',
        'priority': 'LOW',
        'target_state': 'RECEIVED',
    },
    {
        'owner_username': 'iris.member',  # Initech LLC
        'serial_number': 'CLR-M-0006',
        'first_ship_date': '2022-03-01',
        'fault_notes': 'Camera LR housing corroded, lens foggy. '
                       'Unit was deployed outdoors without enclosure.',
        'priority': 'NORMAL',
        'target_state': 'REJECTED',
        'rejection_reason': 'Unit is outside 2-year warranty period. Environmental '
                            'damage not covered. Recommend replacement purchase.',
    },
    {
        'owner_username': 'jack.manager',  # Wayne Enterprises
        'serial_number': 'N46-M-0001',
        'first_ship_date': '2024-11-20',
        'fault_notes': 'Node 4.6 ethernet port 3 dead. Other ports functional. '
                       'Need full port connectivity for deployment.',
        'priority': 'HIGH',
        'target_state': 'SHIPPED',
        'root_cause': 'Damaged ethernet transformer on port 3',
        'parts_replaced': 'Ethernet transformer IC, port 3 connector',
        'cost_to_repair': '$95.00',
    },
    {
        'owner_username': 'kate.member',  # Wayne Enterprises
        'serial_number': 'NGA-A-0003',
        'first_ship_date': '2025-02-01',
        'fault_notes': 'Node 4.6 GA fan running at max RPM constantly. '
                       'Thermal readings normal but fan controller unresponsive.',
        'priority': 'NORMAL',
        'target_state': 'REPAIRED',
        'root_cause': 'Fan controller firmware corrupted — PWM signal stuck at 100%',
        'parts_replaced': 'Fan controller board',
        'cost_to_repair': '$45.00',
    },
]

# State progression order for building history
STATE_ORDER = [
    'SUBMITTED', 'APPROVED', 'RECEIVED', 'DIAGNOSED',
    'REPAIRED', 'REPLACED', 'SHIPPED', 'COMPLETED',
]


class Command(BaseCommand):
    help = 'Populate RMAinator with demo user stubs and RMAs'

    def handle(self, *args, **options):
        self.stdout.write('Seeding RMAinator demo data...')
        users, user_companies = self._create_user_stubs()
        admin = users.get('admin') or users.get('alice.admin')
        self._create_rmas(users, user_companies, admin)
        self.stdout.write(self.style.SUCCESS('✓ RMAinator demo data seeded'))

    def _create_user_stubs(self):
        """Create minimal local User records matching Authinator IDs."""
        users = {}
        user_companies = {}  # Track company_id for each user
        for uid, username, email, company_id in USER_STUBS:
            user, created = User.objects.get_or_create(
                id=uid,
                defaults={'username': username, 'email': email},
            )
            if not created and user.username != username:
                user.username = username
                user.email = email
                user.save(update_fields=['username', 'email'])
            users[username] = user
            user_companies[username] = company_id
            status = 'created' if created else 'exists'
            self.stdout.write(f'  User stub: {username} (id={uid}, company={company_id}, {status})')
        return users, user_companies

    def _create_rmas(self, users, user_companies, admin_user):
        """Create RMAs with state history."""
        # Create a group for the first two RMAs (same owner, same batch)
        group, _ = RMAGroup.objects.get_or_create(
            id=1,
            defaults={'created_by': users['bob.manager']},
        )

        for i, spec in enumerate(RMAS, start=1):
            owner = users[spec['owner_username']]
            if RMA.objects.filter(serial_number=spec['serial_number']).exists():
                self.stdout.write(f'  RMA: SN {spec["serial_number"]} (exists)')
                continue

            first_ship = None
            if spec.get('first_ship_date'):
                from datetime import date as d
                parts = spec['first_ship_date'].split('-')
                first_ship = d(int(parts[0]), int(parts[1]), int(parts[2]))

            # Get company_id from user mapping
            company_id = user_companies.get(spec['owner_username'])
            
            rma = RMA(
                rma_number=i,
                owner=owner,
                company_id=company_id,
                group=group if spec['owner_username'] == 'bob.manager' else None,
                serial_number=spec['serial_number'],
                first_ship_date=first_ship,
                fault_notes=spec['fault_notes'],
                priority=spec['priority'],
                state=spec['target_state'],
                root_cause=spec.get('root_cause', ''),
                parts_replaced=spec.get('parts_replaced', ''),
                cost_to_repair=spec.get('cost_to_repair', ''),
                rejection_reason=spec.get('rejection_reason', ''),
            )
            # Set technical fields for completed/shipped RMAs
            if spec['target_state'] in ('SHIPPED', 'COMPLETED'):
                rma.script_ran = True
                rma.services_enabled = True
                rma.uptime_good = True
                rma.stream_good = True
                rma.ship_ready = True
            if spec['target_state'] in ('RECEIVED', 'DIAGNOSED', 'REPAIRED',
                                         'REPLACED', 'SHIPPED', 'COMPLETED'):
                rma.rma_received_date = (timezone.now() - timedelta(days=20 - i * 2)).date()
            if spec['target_state'] in ('SHIPPED', 'COMPLETED'):
                rma.return_date = (timezone.now() - timedelta(days=5 - i)).date()

            rma.save()
            # Backdate created_at
            base_days = 25 - i * 2
            RMA.objects.filter(pk=rma.pk).update(created_at=dt_days_ago(max(base_days, 3)))

            # Build state history
            self._build_state_history(rma, spec['target_state'], admin_user, owner, base_days)
            self.stdout.write(
                f'  RMA #{i}: {spec["serial_number"]} → {spec["target_state"]} '
                f'({spec["owner_username"]})'
            )

    def _build_state_history(self, rma, target_state, admin_user, owner, base_days):
        """Create realistic state history entries leading to target_state."""
        if target_state == 'REJECTED':
            transitions = [('', 'SUBMITTED'), ('SUBMITTED', 'REJECTED')]
        else:
            idx = STATE_ORDER.index(target_state)
            transitions = []
            for j in range(idx + 1):
                from_st = STATE_ORDER[j - 1] if j > 0 else ''
                to_st = STATE_ORDER[j]
                transitions.append((from_st, to_st))

        for step, (from_st, to_st) in enumerate(transitions):
            days_offset = base_days - step * 2
            changed_by = owner if to_st == 'SUBMITTED' else admin_user
            notes = self._history_note(to_st)
            RMAStateHistory.objects.get_or_create(
                rma=rma, from_state=from_st, to_state=to_st,
                defaults={
                    'changed_by': changed_by,
                    'notes': notes,
                },
            )
            # Backdate
            hist = RMAStateHistory.objects.filter(
                rma=rma, from_state=from_st, to_state=to_st,
            ).first()
            if hist:
                RMAStateHistory.objects.filter(pk=hist.pk).update(
                    changed_at=dt_days_ago(max(days_offset, 1))
                )

    @staticmethod
    def _history_note(state):
        notes = {
            'SUBMITTED': 'RMA submitted by customer',
            'APPROVED': 'RMA approved — shipping label sent to customer',
            'RECEIVED': 'Unit received at repair facility',
            'DIAGNOSED': 'Diagnosis complete — see root cause',
            'REPAIRED': 'Repair completed and verified',
            'REPLACED': 'Replacement unit allocated',
            'SHIPPED': 'Return shipment dispatched',
            'COMPLETED': 'Customer confirmed receipt — RMA closed',
            'REJECTED': 'RMA rejected — see rejection reason',
        }
        return notes.get(state, '')
