from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('rma', '0005_rmagroup_editable_created_at'),
    ]

    operations = [
        migrations.AddField(
            model_name='rma',
            name='repair_notes',
            field=models.TextField(blank=True, help_text='Internal repair notes and observations'),
        ),
    ]
