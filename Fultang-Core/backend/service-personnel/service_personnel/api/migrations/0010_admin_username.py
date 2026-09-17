from django.db import migrations, models


class Migration(migrations.Migration):
    """
    Onboarding admin sécurisé — étape 2 (corrections finales) : ajoute
    `Admin.username`, défini par l'administrateur lui-même pendant
    l'activation (AdminActivationCompleteView). Ne remplace jamais
    `email` comme identifiant de connexion.
    """

    dependencies = [
        ('api', '0009_admin_activation'),
    ]

    operations = [
        migrations.AddField(
            model_name='admin',
            name='username',
            field=models.CharField(blank=True, max_length=150, null=True),
        ),
        migrations.AddConstraint(
            model_name='admin',
            constraint=models.UniqueConstraint(fields=['tenant_id', 'username'], name='api_admin_unique_username_per_tenant'),
        ),
    ]
