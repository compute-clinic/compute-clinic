from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('medical_workflow', '0015_parcours_caisse_validation_hospitalisation'),
    ]

    operations = [
        migrations.AddField(
            model_name='visite',
            name='service_id',
            field=models.IntegerField(
                blank=True,
                help_text="Isolation : un soignant d'un autre service ne voit pas ce dossier.",
                null=True,
                verbose_name='Service hospitalier (id personnel)',
            ),
        ),
        migrations.AddField(
            model_name='visite',
            name='service_nom',
            field=models.CharField(
                blank=True,
                default='',
                max_length=120,
                verbose_name='Nom du service',
            ),
        ),
        migrations.AddField(
            model_name='hospitalisation',
            name='service_id',
            field=models.IntegerField(
                blank=True,
                null=True,
                verbose_name="Service d'accueil (id personnel)",
            ),
        ),
    ]
