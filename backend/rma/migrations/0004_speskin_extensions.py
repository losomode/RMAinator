"""
Migration: speskin extensions

Changes:
- RMAGroup: add name, company_id, return_shipping_address
- RMA: add device_type, ipn, return_tracking_number
- RMA: rename tx2_mac → device_mac
- RMA: convert parts_replaced from TextField → JSONField (with data migration)
- RMA: drop old QA fields (script_ran, services_enabled, uptime_good, stream_good, ship_ready)
- RMA: add new QA checklist fields (qa_*)
- RMA: add IN_QA and READY_FOR_RETURN state choices (DB max_length unchanged at 20)
"""
import django.db.models.deletion
import json
from django.conf import settings
from django.db import migrations, models


def convert_parts_replaced_to_json(apps, schema_editor):
    """Convert existing parts_replaced text values to JSON arrays."""
    # Access the raw table since the field type is changing
    db_alias = schema_editor.connection.alias
    RMA = apps.get_model('rma', 'RMA')
    for rma in RMA.objects.using(db_alias).all():
        raw_value = rma.parts_replaced
        if not raw_value:
            rma.parts_replaced = json.dumps([])
        elif isinstance(raw_value, str):
            try:
                parsed = json.loads(raw_value)
                # Already valid JSON — keep as-is
                rma.parts_replaced = json.dumps(parsed if isinstance(parsed, list) else [raw_value])
            except (json.JSONDecodeError, ValueError):
                rma.parts_replaced = json.dumps([raw_value])
        rma.save(update_fields=['parts_replaced'])


def reverse_convert_parts_replaced(apps, schema_editor):
    """Reverse: convert JSON arrays back to plain text (join with newline)."""
    db_alias = schema_editor.connection.alias
    RMA = apps.get_model('rma', 'RMA')
    for rma in RMA.objects.using(db_alias).all():
        raw_value = rma.parts_replaced
        if not raw_value:
            rma.parts_replaced = ''
        elif isinstance(raw_value, str):
            try:
                parsed = json.loads(raw_value)
                rma.parts_replaced = '\n'.join(str(p) for p in parsed) if isinstance(parsed, list) else raw_value
            except (json.JSONDecodeError, ValueError):
                rma.parts_replaced = raw_value
        rma.save(update_fields=['parts_replaced'])


class Migration(migrations.Migration):

    dependencies = [
        ('rma', '0003_rma_company_id_rma_rma_rma_company_9c174c_idx'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # ── RMAGroup new fields ────────────────────────────────────────────
        migrations.AddField(
            model_name='rmagroup',
            name='name',
            field=models.CharField(blank=True, help_text='Optional display name for this group', max_length=255),
        ),
        migrations.AddField(
            model_name='rmagroup',
            name='company_id',
            field=models.IntegerField(blank=True, db_index=True, help_text='Company ID from USERinator', null=True),
        ),
        migrations.AddField(
            model_name='rmagroup',
            name='return_shipping_address',
            field=models.TextField(blank=True, help_text='Address to ship repaired devices back to'),
        ),

        # ── RMA: rename tx2_mac → device_mac ──────────────────────────────
        migrations.RenameField(
            model_name='rma',
            old_name='tx2_mac',
            new_name='device_mac',
        ),

        # ── RMA: remove old QA boolean fields ─────────────────────────────
        migrations.RemoveField(model_name='rma', name='script_ran'),
        migrations.RemoveField(model_name='rma', name='services_enabled'),
        migrations.RemoveField(model_name='rma', name='uptime_good'),
        migrations.RemoveField(model_name='rma', name='stream_good'),
        migrations.RemoveField(model_name='rma', name='ship_ready'),

        # ── RMA: new customer-facing fields ───────────────────────────────
        migrations.AddField(
            model_name='rma',
            name='device_type',
            field=models.CharField(blank=True, help_text='e.g. TX2 Camera, Orin Node', max_length=100),
        ),
        migrations.AddField(
            model_name='rma',
            name='ipn',
            field=models.CharField(blank=True, help_text='Internal Part Number (optional)', max_length=100),
        ),

        # ── RMA: new admin fields ──────────────────────────────────────────
        migrations.AddField(
            model_name='rma',
            name='return_tracking_number',
            field=models.CharField(blank=True, max_length=200),
        ),

        # ── RMA: convert parts_replaced TextField → JSONField ─────────────
        # Step 1: convert existing text data to JSON strings in-place
        migrations.RunPython(
            convert_parts_replaced_to_json,
            reverse_convert_parts_replaced,
        ),
        # Step 2: alter the column type
        migrations.AlterField(
            model_name='rma',
            name='parts_replaced',
            field=models.JSONField(blank=True, default=list, help_text='List of parts replaced'),
        ),

        # ── RMA: new QA checklist fields ───────────────────────────────────
        migrations.AddField(
            model_name='rma',
            name='qa_reflashed',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='rma',
            name='qa_image_version',
            field=models.CharField(blank=True, help_text='Firmware/image version after re-flash', max_length=100),
        ),
        migrations.AddField(
            model_name='rma',
            name='qa_nvme_data_ok',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='rma',
            name='qa_services_ok',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='rma',
            name='qa_uptime_ok',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='rma',
            name='qa_stream_uptime_ok',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='rma',
            name='qa_lens_control_ok',
            field=models.BooleanField(default=False),
        ),

        # ── RMA: update fault_notes to allow blank ─────────────────────────
        migrations.AlterField(
            model_name='rma',
            name='fault_notes',
            field=models.TextField(blank=True, help_text='Issue description and other comments'),
        ),

        # ── RMA: update state field to allow new state values ─────────────
        # (IN_QA=5 chars, READY_FOR_RETURN=16 chars — both fit max_length=20)
        migrations.AlterField(
            model_name='rma',
            name='state',
            field=models.CharField(
                choices=[
                    ('SUBMITTED', 'Submitted'),
                    ('APPROVED', 'Approved'),
                    ('REJECTED', 'Rejected'),
                    ('RECEIVED', 'Received'),
                    ('DIAGNOSED', 'Diagnosed'),
                    ('REPAIRED', 'Repaired'),
                    ('REPLACED', 'Replaced'),
                    ('IN_QA', 'In QA / Pre-Shipment Testing'),
                    ('READY_FOR_RETURN', 'Ready for Return, Awaiting Shipment'),
                    ('SHIPPED', 'Shipped'),
                    ('COMPLETED', 'Completed'),
                ],
                default='SUBMITTED',
                max_length=20,
            ),
        ),
    ]
