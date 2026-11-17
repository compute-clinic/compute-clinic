# Generated manually — Responsable RH + workflow demande de service

import uuid
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0007_service_decret_prime'),
    ]

    operations = [
        migrations.CreateModel(
            name='ResponsableRH',
            fields=[
                ('id_personnel', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('tenant_id', models.UUIDField(blank=True, db_index=True, editable=False, null=True)),
                ('nom', models.CharField(max_length=100)),
                ('prenom', models.CharField(max_length=100)),
                ('date_naissance', models.DateField()),
                ('adresse', models.TextField()),
                ('email', models.EmailField(max_length=254)),
                ('contact', models.CharField(max_length=50)),
                ('matricule', models.CharField(max_length=50)),
                ('date_embauche', models.DateField()),
                ('statut', models.CharField(choices=[('Actif', 'Actif'), ('Congé', 'Congé'), ('Suspendu', 'Suspendu'), ('Autre', 'Autre')], default='Actif', max_length=20)),
                ('mot_de_passe', models.CharField(max_length=255)),
                ('service', models.ForeignKey(blank=True, null=True, on_delete=models.deletion.SET_NULL, related_name='%(class)s_personnels', to='api.service')),
            ],
            options={
                'abstract': False,
            },
        ),
        migrations.AddConstraint(
            model_name='responsablerh',
            constraint=models.UniqueConstraint(fields=('tenant_id', 'email'), name='api_responsablerh_unique_email_per_tenant'),
        ),
        migrations.AddConstraint(
            model_name='responsablerh',
            constraint=models.UniqueConstraint(fields=('tenant_id', 'matricule'), name='api_responsablerh_unique_matricule_per_tenant'),
        ),
        migrations.CreateModel(
            name='DemandeService',
            fields=[
                ('id_demande', models.AutoField(primary_key=True, serialize=False)),
                ('tenant_id', models.UUIDField(blank=True, db_index=True, null=True)),
                ('nom_service_propose', models.CharField(max_length=100)),
                ('desc_service', models.TextField(blank=True, default='')),
                ('code_analytique_propose', models.CharField(blank=True, default='', max_length=100)),
                ('statut', models.CharField(choices=[('SOUMISE', 'Soumise au directeur'), ('SIGNEE_DIRECTEUR', 'Signée par le directeur'), ('ENVOYEE_PLATEFORME', 'Envoyée à CompuClinic'), ('APPROUVEE', 'Service créé'), ('REJETEE', 'Rejetée')], default='SOUMISE', max_length=32)),
                ('demandeur_id', models.UUIDField(db_index=True)),
                ('demandeur_email', models.EmailField(blank=True, default='', max_length=254)),
                ('commentaire_admin', models.TextField(blank=True, default='')),
                ('signature_directeur_id', models.UUIDField(blank=True, null=True)),
                ('commentaire_directeur', models.TextField(blank=True, default='')),
                ('date_signature_directeur', models.DateTimeField(blank=True, null=True)),
                ('date_envoi_plateforme', models.DateTimeField(blank=True, null=True)),
                ('date_traitement_plateforme', models.DateTimeField(blank=True, null=True)),
                ('service_cree_id', models.IntegerField(blank=True, null=True)),
                ('motif_rejet', models.TextField(blank=True, default='')),
                ('date_creation', models.DateTimeField(auto_now_add=True)),
                ('date_maj', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Demande de service',
                'verbose_name_plural': 'Demandes de service',
                'ordering': ['-date_creation'],
            },
        ),
    ]
