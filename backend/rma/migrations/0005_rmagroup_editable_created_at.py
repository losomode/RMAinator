"""
Migration: make RMAGroup.created_at editable

Changes auto_now_add=True to default=timezone.now so admins can set
historical dates when backfilling RMA data.
"""
import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('rma', '0004_speskin_extensions'),
    ]

    operations = [
        migrations.AlterField(
            model_name='rmagroup',
            name='created_at',
            field=models.DateTimeField(default=django.utils.timezone.now),
        ),
    ]
