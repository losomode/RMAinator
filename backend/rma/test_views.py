"""
Tests for RMA views/API endpoints.
"""
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from unittest.mock import patch
from rma.models import RMA, RMAGroup
from core.test_utils import create_mock_user, create_mock_admin, authenticate_user


COMPANY_ID = 42
COMPANY_DATA = {'id': COMPANY_ID, 'name': 'Test Co'}


def _mock_get_company(company_id):
    """Return mock company data for valid company IDs used in tests."""
    if company_id == COMPANY_ID:
        return COMPANY_DATA
    return None


class RMAListCreateViewTest(TestCase):
    """Test RMA list and create endpoints."""

    def setUp(self):
        """Set up test data."""
        self.client = APIClient()
        self.user = create_mock_user(username='user1', company_id=COMPANY_ID)
        self.user2 = create_mock_user(username='user2', company_id=COMPANY_ID + 1)
        self.admin = create_mock_admin(username='admin')

        # Create test RMAs with company_id
        self.rma1 = RMA.objects.create(
            serial_number='SN1',
            owner=self.user,
            fault_notes='Issue 1',
            company_id=COMPANY_ID,
        )
        self.rma2 = RMA.objects.create(
            serial_number='SN2',
            owner=self.user2,
            fault_notes='Issue 2',
            company_id=COMPANY_ID + 1,
        )

    def test_list_rmas_as_user_company_scoped(self):
        """Test user only sees RMAs from their own company."""
        authenticate_user(self.client, self.user)
        response = self.client.get('/api/rma/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['serial_number'], 'SN1')

    def test_list_rmas_as_admin(self):
        """Test admin can see all RMAs."""
        authenticate_user(self.client, self.admin)
        response = self.client.get('/api/rma/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_list_archived_filter(self):
        """Test filtering archived RMAs."""
        # Create completed RMA for user's company
        RMA.objects.create(
            serial_number='SN3',
            owner=self.user,
            state=RMA.State.COMPLETED,
            company_id=COMPANY_ID,
        )

        authenticate_user(self.client, self.user)

        # Test active RMAs
        response = self.client.get('/api/rma/?archived=false')
        self.assertEqual(len(response.data), 1)

        # Test archived RMAs
        response = self.client.get('/api/rma/?archived=true')
        self.assertEqual(len(response.data), 1)


class RMADetailViewTest(TestCase):
    """Test RMA detail, update, delete endpoints."""

    def setUp(self):
        """Set up test data."""
        self.client = APIClient()
        self.user = create_mock_user(company_id=COMPANY_ID)
        self.user2 = create_mock_user(company_id=COMPANY_ID + 1)
        self.admin = create_mock_admin()

        self.rma = RMA.objects.create(
            serial_number='SN1',
            owner=self.user,
            fault_notes='Test issue',
            company_id=COMPANY_ID,
        )

    def test_get_rma_detail_as_owner(self):
        """Test user can view an RMA from their company."""
        authenticate_user(self.client, self.user)
        response = self.client.get(f'/api/rma/{self.rma.id}/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['serial_number'], 'SN1')

    def test_get_rma_detail_as_other_company_user(self):
        """Test user from different company cannot view RMA."""
        authenticate_user(self.client, self.user2)
        response = self.client.get(f'/api/rma/{self.rma.id}/')

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_get_rma_detail_as_admin(self):
        """Test admin can view any RMA."""
        authenticate_user(self.client, self.admin)
        response = self.client.get(f'/api/rma/{self.rma.id}/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_update_rma_admin_fields(self):
        """Test admin can update admin fields including new QA checklist fields."""
        authenticate_user(self.client, self.admin)
        data = {
            'priority': 'HIGH',
            'device_mac': 'AA:BB:CC:DD:EE:FF',
            'return_tracking_number': 'TRK123',
            'parts_replaced': ['Motherboard', 'SSD'],
            'qa_reflashed': True,
            'qa_image_version': 'v2.1.0',
            'qa_services_ok': True,
        }
        response = self.client.patch(
            f'/api/rma/{self.rma.id}/',
            data,
            format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.rma.refresh_from_db()
        self.assertEqual(self.rma.priority, RMA.Priority.HIGH)
        self.assertEqual(self.rma.device_mac, 'AA:BB:CC:DD:EE:FF')
        self.assertEqual(self.rma.return_tracking_number, 'TRK123')
        self.assertEqual(self.rma.parts_replaced, ['Motherboard', 'SSD'])
        self.assertTrue(self.rma.qa_reflashed)
        self.assertEqual(self.rma.qa_image_version, 'v2.1.0')

    def test_admin_fields_hidden_from_non_admin(self):
        """Test admin-only fields are not exposed to non-admin users."""
        authenticate_user(self.client, self.user)
        response = self.client.get(f'/api/rma/{self.rma.id}/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for field in ['device_mac', 'return_tracking_number', 'qa_reflashed',
                      'qa_services_ok', 'parts_replaced']:
            self.assertNotIn(field, response.data)


class RMAStateUpdateViewTest(TestCase):
    """Test RMA state transition endpoint."""

    def setUp(self):
        """Set up test data."""
        self.client = APIClient()
        self.user = create_mock_user(company_id=COMPANY_ID)
        self.admin = create_mock_admin()

        self.rma = RMA.objects.create(
            serial_number='SN1',
            owner=self.user,
            state=RMA.State.SUBMITTED,
            company_id=COMPANY_ID,
        )
    
    def test_state_update_as_non_admin(self):
        """Test non-admin cannot update state."""
        authenticate_user(self.client, self.user)
        data = {'state': RMA.State.APPROVED}
        response = self.client.post(
            f'/api/rma/{self.rma.id}/state/',
            data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_state_update_as_admin(self):
        """Test admin can update state."""
        authenticate_user(self.client, self.admin)
        data = {'state': RMA.State.APPROVED, 'notes': 'Approved for RMA'}
        response = self.client.post(
            f'/api/rma/{self.rma.id}/state/',
            data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.rma.refresh_from_db()
        self.assertEqual(self.rma.state, RMA.State.APPROVED)
    
    def test_admin_cannot_skip_forward(self):
        """Test admin cannot skip forward states (e.g. SUBMITTED -> SHIPPED)."""
        authenticate_user(self.client, self.admin)
        data = {'state': RMA.State.SHIPPED}
        response = self.client.post(
            f'/api/rma/{self.rma.id}/state/',
            data,
            format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_repaired_transitions_to_in_qa(self):
        """Test REPAIRED state now goes to IN_QA, not directly to SHIPPED."""
        authenticate_user(self.client, self.admin)
        self.rma.state = RMA.State.REPAIRED
        self.rma.save()

        # Should succeed: REPAIRED -> IN_QA
        response = self.client.post(
            f'/api/rma/{self.rma.id}/state/',
            {'state': RMA.State.IN_QA},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_repaired_cannot_go_directly_to_shipped(self):
        """Test REPAIRED can no longer skip directly to SHIPPED."""
        authenticate_user(self.client, self.admin)
        self.rma.state = RMA.State.REPAIRED
        self.rma.save()

        response = self.client.post(
            f'/api/rma/{self.rma.id}/state/',
            {'state': RMA.State.SHIPPED},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_in_qa_to_ready_for_return(self):
        """Test IN_QA transitions to READY_FOR_RETURN."""
        authenticate_user(self.client, self.admin)
        self.rma.state = RMA.State.IN_QA
        self.rma.save()

        response = self.client.post(
            f'/api/rma/{self.rma.id}/state/',
            {'state': RMA.State.READY_FOR_RETURN},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_ready_for_return_to_shipped(self):
        """Test READY_FOR_RETURN transitions to SHIPPED."""
        authenticate_user(self.client, self.admin)
        self.rma.state = RMA.State.READY_FOR_RETURN
        self.rma.save()

        response = self.client.post(
            f'/api/rma/{self.rma.id}/state/',
            {'state': RMA.State.SHIPPED},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_auto_populate_rma_received_date(self):
        """Test rma_received_date is auto-set when transitioning to RECEIVED."""
        authenticate_user(self.client, self.admin)
        self.rma.state = RMA.State.APPROVED
        self.rma.save()
        self.assertIsNone(self.rma.rma_received_date)

        response = self.client.post(
            f'/api/rma/{self.rma.id}/state/',
            {'state': RMA.State.RECEIVED},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.rma.refresh_from_db()
        self.assertIsNotNone(self.rma.rma_received_date)

    def test_auto_receive_date_not_overwritten(self):
        """Test existing rma_received_date is NOT overwritten on RECEIVED transition."""
        from datetime import date
        existing_date = date(2025, 1, 15)
        authenticate_user(self.client, self.admin)
        self.rma.state = RMA.State.APPROVED
        self.rma.rma_received_date = existing_date
        self.rma.save()

        self.client.post(
            f'/api/rma/{self.rma.id}/state/',
            {'state': RMA.State.RECEIVED},
            format='json'
        )
        self.rma.refresh_from_db()
        self.assertEqual(self.rma.rma_received_date, existing_date)
    
    def test_admin_can_revert_state(self):
        """Test admin can revert RMA to a prior state within active range."""
        authenticate_user(self.client, self.admin)
        self.rma.state = RMA.State.DIAGNOSED
        self.rma.save()
        
        data = {'state': RMA.State.RECEIVED, 'notes': 'Need to re-examine'}
        response = self.client.post(
            f'/api/rma/{self.rma.id}/state/',
            data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.rma.refresh_from_db()
        self.assertEqual(self.rma.state, RMA.State.RECEIVED)
    
    def test_admin_can_revert_to_submitted(self):
        """Test admin can revert back to SUBMITTED from active range."""
        authenticate_user(self.client, self.admin)
        self.rma.state = RMA.State.APPROVED
        self.rma.save()
        
        data = {'state': RMA.State.SUBMITTED, 'notes': 'Reverting approval'}
        response = self.client.post(
            f'/api/rma/{self.rma.id}/state/',
            data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.rma.refresh_from_db()
        self.assertEqual(self.rma.state, RMA.State.SUBMITTED)
    
    def test_admin_cannot_reopen_completed(self):
        """Test admin cannot reopen a completed RMA."""
        authenticate_user(self.client, self.admin)
        self.rma.state = RMA.State.COMPLETED
        self.rma.save()
        
        data = {'state': RMA.State.SHIPPED}
        response = self.client.post(
            f'/api/rma/{self.rma.id}/state/',
            data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_admin_cannot_reopen_rejected(self):
        """Test admin cannot reopen a rejected RMA."""
        authenticate_user(self.client, self.admin)
        self.rma.state = RMA.State.REJECTED
        self.rma.save()
        
        data = {'state': RMA.State.SUBMITTED}
        response = self.client.post(
            f'/api/rma/{self.rma.id}/state/',
            data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_admin_cannot_set_same_state(self):
        """Test admin gets error when setting same state."""
        authenticate_user(self.client, self.admin)
        data = {'state': RMA.State.SUBMITTED}
        response = self.client.post(
            f'/api/rma/{self.rma.id}/state/',
            data,
            format='json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class RMAGroupCreateViewTest(TestCase):
    """Test RMA group creation and detail/update."""

    def setUp(self):
        """Set up test data."""
        self.client = APIClient()
        self.user = create_mock_user(company_id=COMPANY_ID)
        self.admin = create_mock_admin()
        self.patcher = patch(
            'rma.serializers.userinator_client.get_company',
            side_effect=_mock_get_company
        )
        self.patcher.start()

    def tearDown(self):
        self.patcher.stop()

    def test_create_rma_group(self):
        """Test creating multiple RMAs in a group with required company."""
        authenticate_user(self.client, self.user)
        data = {
            'company_id': COMPANY_ID,
            'name': 'Q1 Batch',
            'rmas': [
                {
                    'serial_number': 'SN1',
                    'device_type': 'TX2 Camera',
                    'fault_notes': 'Issue 1',
                    'priority': 'NORMAL',
                    'company_id': COMPANY_ID,
                },
                {
                    'serial_number': 'SN2',
                    'device_type': 'Orin Node',
                    'fault_notes': 'Issue 2',
                    'priority': 'HIGH',
                    'company_id': COMPANY_ID,
                },
            ]
        }
        response = self.client.post('/api/rma/group/', data, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(response.data['rmas']), 2)

        # Verify group was created with name and company_id
        group_id = response.data['group']['id']
        group = RMAGroup.objects.get(id=group_id)
        self.assertEqual(group.rmas.count(), 2)
        self.assertEqual(group.name, 'Q1 Batch')
        self.assertEqual(group.company_id, COMPANY_ID)

    def test_group_requires_company(self):
        """Test group creation fails without company_id."""
        authenticate_user(self.client, self.user)
        data = {
            'rmas': [{
                'serial_number': 'SN1',
                'device_type': 'TX2 Camera',
                'fault_notes': 'Issue',
                'priority': 'NORMAL',
                'company_id': COMPANY_ID,
            }]
        }
        response = self.client.post('/api/rma/group/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_group_detail_get(self):
        """Test fetching group detail."""
        group = RMAGroup.objects.create(
            created_by=self.user,
            company_id=COMPANY_ID,
            name='Test Group',
        )
        RMA.objects.create(
            serial_number='SN1', owner=self.user,
            group=group, company_id=COMPANY_ID,
        )
        authenticate_user(self.client, self.user)
        response = self.client.get(f'/api/rma/group/{group.id}/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'Test Group')
        self.assertEqual(len(response.data['rmas']), 1)

    def test_group_rename_admin(self):
        """Test admin can rename a group."""
        group = RMAGroup.objects.create(
            created_by=self.admin,
            company_id=COMPANY_ID,
            name='Old Name',
        )
        authenticate_user(self.client, self.admin)
        response = self.client.patch(
            f'/api/rma/group/{group.id}/',
            {'name': 'New Name'},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        group.refresh_from_db()
        self.assertEqual(group.name, 'New Name')

    def test_group_rename_non_admin_forbidden(self):
        """Test non-admin cannot rename a group."""
        group = RMAGroup.objects.create(
            created_by=self.user,
            company_id=COMPANY_ID,
        )
        authenticate_user(self.client, self.user)
        response = self.client.patch(
            f'/api/rma/group/{group.id}/',
            {'name': 'Hacked Name'},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class RMAGroupBulkStateViewTest(TestCase):
    """Test bulk state transitions on RMA groups."""

    def setUp(self):
        self.client = APIClient()
        self.user = create_mock_user(company_id=COMPANY_ID)
        self.admin = create_mock_admin()
        self.group = RMAGroup.objects.create(
            created_by=self.user,
            company_id=COMPANY_ID,
        )
        self.rma1 = RMA.objects.create(
            serial_number='SN1', owner=self.user,
            group=self.group, company_id=COMPANY_ID,
            state=RMA.State.SUBMITTED,
        )
        self.rma2 = RMA.objects.create(
            serial_number='SN2', owner=self.user,
            group=self.group, company_id=COMPANY_ID,
            state=RMA.State.SUBMITTED,
        )

    def test_non_admin_cannot_bulk(self):
        """Test non-admins cannot use bulk-state."""
        authenticate_user(self.client, self.user)
        response = self.client.post(
            f'/api/rma/group/{self.group.id}/bulk-state/',
            {'state': 'APPROVED'},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_bulk_approve_all(self):
        """Test bulk approve moves all SUBMITTED RMAs to APPROVED."""
        authenticate_user(self.client, self.admin)
        response = self.client.post(
            f'/api/rma/group/{self.group.id}/bulk-state/',
            {'state': 'APPROVED'},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for rma in [self.rma1, self.rma2]:
            rma.refresh_from_db()
            self.assertEqual(rma.state, RMA.State.APPROVED)

    def test_bulk_approve_invalid_state(self):
        """Test bulk approve fails if not all RMAs are SUBMITTED."""
        self.rma2.state = RMA.State.APPROVED
        self.rma2.save()

        authenticate_user(self.client, self.admin)
        response = self.client.post(
            f'/api/rma/group/{self.group.id}/bulk-state/',
            {'state': 'APPROVED'},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        # rma1 should NOT have been changed (atomicity)
        self.rma1.refresh_from_db()
        self.assertEqual(self.rma1.state, RMA.State.SUBMITTED)

    def test_bulk_ship_requires_tracking_number(self):
        """Test bulk SHIPPED requires a tracking number."""
        self.rma1.state = RMA.State.READY_FOR_RETURN
        self.rma1.save()
        self.rma2.state = RMA.State.READY_FOR_RETURN
        self.rma2.save()

        authenticate_user(self.client, self.admin)
        response = self.client.post(
            f'/api/rma/group/{self.group.id}/bulk-state/',
            {'state': 'SHIPPED'},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_bulk_ship_with_tracking_number(self):
        """Test bulk SHIPPED applies tracking number to all RMAs."""
        self.rma1.state = RMA.State.READY_FOR_RETURN
        self.rma1.save()
        self.rma2.state = RMA.State.READY_FOR_RETURN
        self.rma2.save()

        authenticate_user(self.client, self.admin)
        response = self.client.post(
            f'/api/rma/group/{self.group.id}/bulk-state/',
            {'state': 'SHIPPED', 'tracking_number': 'TRK-XYZ'},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        for rma in [self.rma1, self.rma2]:
            rma.refresh_from_db()
            self.assertEqual(rma.state, RMA.State.SHIPPED)
            self.assertEqual(rma.return_tracking_number, 'TRK-XYZ')

    def test_partial_shipment_with_rma_ids(self):
        """Test partial shipment only ships specified READY_FOR_RETURN devices."""
        self.rma1.state = RMA.State.READY_FOR_RETURN
        self.rma1.save()
        # rma2 is still SUBMITTED

        authenticate_user(self.client, self.admin)
        response = self.client.post(
            f'/api/rma/group/{self.group.id}/bulk-state/',
            {'state': 'SHIPPED', 'tracking_number': 'TRK-PARTIAL', 'rma_ids': [self.rma1.id]},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.rma1.refresh_from_db()
        self.rma2.refresh_from_db()
        self.assertEqual(self.rma1.state, RMA.State.SHIPPED)
        self.assertEqual(self.rma1.return_tracking_number, 'TRK-PARTIAL')
        # rma2 should NOT have changed
        self.assertEqual(self.rma2.state, RMA.State.SUBMITTED)

    def test_partial_shipment_fails_if_selected_not_ready(self):
        """Test partial shipment rejects IDs not in READY_FOR_RETURN state."""
        # rma1 is SUBMITTED, not READY_FOR_RETURN
        authenticate_user(self.client, self.admin)
        response = self.client.post(
            f'/api/rma/group/{self.group.id}/bulk-state/',
            {'state': 'SHIPPED', 'tracking_number': 'TRK-X', 'rma_ids': [self.rma1.id]},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_complete_shipped_only_completes_shipped_devices(self):
        """Test Complete Shipped only transitions SHIPPED devices; leaves others alone."""
        self.rma1.state = RMA.State.SHIPPED
        self.rma1.save()
        # rma2 is still SUBMITTED

        authenticate_user(self.client, self.admin)
        response = self.client.post(
            f'/api/rma/group/{self.group.id}/bulk-state/',
            {'state': 'COMPLETED'},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.rma1.refresh_from_db()
        self.rma2.refresh_from_db()
        self.assertEqual(self.rma1.state, RMA.State.COMPLETED)
        self.assertEqual(self.rma2.state, RMA.State.SUBMITTED)  # unchanged

    def test_complete_shipped_fails_when_no_shipped_devices(self):
        """Test Complete Shipped returns 400 when no devices are in SHIPPED state."""
        # Both still SUBMITTED
        authenticate_user(self.client, self.admin)
        response = self.client.post(
            f'/api/rma/group/{self.group.id}/bulk-state/',
            {'state': 'COMPLETED'},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_bulk_ineligible_state_rejected(self):
        """Test bulk-state rejects non-eligible states."""
        authenticate_user(self.client, self.admin)
        response = self.client.post(
            f'/api/rma/group/{self.group.id}/bulk-state/',
            {'state': 'DIAGNOSED'},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class RMASearchViewTest(TestCase):
    """Test RMA search endpoint (admin only)."""

    def setUp(self):
        """Set up test data."""
        self.client = APIClient()
        self.user = create_mock_user(company_id=COMPANY_ID)
        self.admin = create_mock_admin()

        # Create searchable RMAs
        self.rma1 = RMA.objects.create(
            serial_number='ABC123',
            owner=self.user,
            fault_notes='Network issue',
            company_id=COMPANY_ID,
        )
        self.rma2 = RMA.objects.create(
            serial_number='XYZ789',
            owner=self.user,
            fault_notes='Power problem',
            company_id=COMPANY_ID,
        )
    
    def test_search_as_non_admin(self):
        """Test non-admin cannot access search."""
        authenticate_user(self.client, self.user)
        response = self.client.get('/api/rma/search/')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_search_as_admin(self):
        """Test admin can search RMAs."""
        authenticate_user(self.client, self.admin)
        response = self.client.get('/api/rma/search/?q=ABC')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should find rma1 based on serial number
        results = response.data.get('results', response.data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['serial_number'], 'ABC123')
