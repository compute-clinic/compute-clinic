from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('medical_workflow', '0016_isolation_service_visite_hospitalisation'),
    ]

    operations = [
        migrations.AddField(
            model_name='examen',
            name='medecin_prescripteur_nom',
            field=models.CharField(
                blank=True,
                default='',
                max_length=255,
                verbose_name='Nom du médecin prescripteur',
            ),
        ),
    ]
