# Generated manually because the local Python environment has no Django installed.
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('tenants', '0011_alter_adminactionlog_action_tenantdeletionrecord')]

    operations = [
        migrations.AddField(
            model_name='tenant', name='clinical_data_sharing_policy_accepted',
            field=models.BooleanField(default=False, help_text="Trace l'acceptation explicite de la politique de partage des données cliniques. Requise avant toute activation de l'export."),
        ),
        migrations.AlterField(
            model_name='tenant', name='allow_clinical_agent_export',
            field=models.BooleanField(
                default=False,
                help_text=(
                    "Autorise ou non l'envoi des données médicales anonymisées de "
                    "ce tenant vers clinical-agent / MedTutor. Par défaut True : "
                    "un tenant existant avant l'introduction de ce champ conserve "
                    "le comportement actuel après migration (aucune régression "
                    "silencieuse de fonctionnalité). Source de vérité unique — "
                    "clinical-agent interroge ce champ (via le Tenant Registry) "
                    "avant toute lecture de données destinées à l'export, jamais "
                    "après ; la logique de décision reste dans clinical-agent, ce "
                    "champ n'est qu'une configuration."
                ),
            ),
        ),
    ]
