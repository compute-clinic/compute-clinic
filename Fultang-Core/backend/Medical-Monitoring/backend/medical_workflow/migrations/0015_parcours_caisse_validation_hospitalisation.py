"""
Parcours patient :
  - Visite.paiement_requis : décision de la réception (envoyer à la caisse / passer).
  - Hospitalisation : validation ou refus par l'infirmier de la demande du médecin
    (statut REFUSEE, traçabilité infirmier, motif de refus, date de demande).
"""
import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('medical_workflow', '0014_examen_motif_optional'),
    ]

    operations = [
        migrations.AddField(
            model_name='visite',
            name='paiement_requis',
            field=models.BooleanField(
                default=True,
                help_text=(
                    "Décision de la réception à l'arrivée : True = le patient est envoyé à la caisse "
                    "(dossier invisible pour l'infirmier et le médecin tant que la quittance n'est pas "
                    "validée) ; False = le patient passe directement (dossier visible immédiatement)."
                ),
                verbose_name='Passage en caisse requis',
            ),
        ),
        migrations.AlterField(
            model_name='hospitalisation',
            name='statut',
            field=models.CharField(
                choices=[
                    ('EN_ATTENTE_LIT', 'En attente de validation infirmier (lit)'),
                    ('EN_COURS', 'En cours'),
                    ('EN_SORTIE', 'En cours de sortie'),
                    ('TERMINE', 'Terminée'),
                    ('REFUSEE', "Non hospitalisé (refusée par l'infirmier)"),
                ],
                default='EN_ATTENTE_LIT',
                max_length=20,
                verbose_name='Statut',
            ),
        ),
        migrations.AddField(
            model_name='hospitalisation',
            name='date_demande',
            field=models.DateTimeField(
                auto_now_add=True, null=True, default=django.utils.timezone.now,
                verbose_name='Date de la demande médicale',
            ),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='hospitalisation',
            name='infirmier_validation_id',
            field=models.UUIDField(blank=True, null=True, verbose_name='Infirmier ayant confirmé ou refusé'),
        ),
        migrations.AddField(
            model_name='hospitalisation',
            name='date_validation_infirmier',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='hospitalisation',
            name='motif_refus',
            field=models.TextField(blank=True, default='', verbose_name='Motif de non-hospitalisation'),
        ),
    ]
