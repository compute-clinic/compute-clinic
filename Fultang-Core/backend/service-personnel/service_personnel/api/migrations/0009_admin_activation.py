import uuid

import api.models
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    """
    Onboarding admin sécurisé (Cycle de vie du tenant) : ajoute
    `Admin.compte_active` (défaut True — aucun changement pour les
    comptes existants) et le modèle `AdminActivationToken` (token à usage
    unique remplaçant l'envoi d'un mot de passe temporaire par email).
    """

    dependencies = [
        ('api', '0008_add_caissier'),
    ]

    operations = [
        migrations.AddField(
            model_name='admin',
            name='compte_active',
            field=models.BooleanField(default=True),
        ),
        migrations.CreateModel(
            name='AdminActivationToken',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('tenant_id', models.UUIDField(db_index=True)),
                ('token', models.CharField(default=api.models._generate_activation_token, editable=False, max_length=64, unique=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('expires_at', models.DateTimeField(default=api.models._default_activation_expiry)),
                ('used_at', models.DateTimeField(blank=True, null=True)),
                ('admin', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='activation_tokens', to='api.admin')),
            ],
        ),
    ]
