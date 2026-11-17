import uuid

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0008_responsable_rh_demande_service'),
    ]

    operations = [
        migrations.CreateModel(
            name='DocumentPersonnel',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('tenant_id', models.UUIDField(blank=True, db_index=True, editable=False, null=True)),
                ('personnel_id', models.UUIDField(db_index=True)),
                ('type_document', models.CharField(
                    choices=[
                        ('CNI', "Pièce d'identité"),
                        ('CV', 'Curriculum vitae'),
                        ('DIPLOME', 'Diplôme'),
                        ('CONTRAT', 'Contrat de travail'),
                        ('ATTESTATION', 'Attestation'),
                        ('PHOTO', "Photo d'identité"),
                        ('CERTIFICAT', 'Certificat médical'),
                        ('AUTRE', 'Autre'),
                    ],
                    default='AUTRE',
                    max_length=20,
                )),
                ('libelle', models.CharField(blank=True, default='', max_length=255)),
                ('fichier', models.FileField(upload_to='papiers/%Y/%m/')),
                ('date_depot', models.DateTimeField(auto_now_add=True)),
                ('depose_par_id', models.UUIDField(blank=True, null=True)),
            ],
            options={
                'verbose_name': 'Document personnel',
                'verbose_name_plural': 'Documents personnel',
                'ordering': ['-date_depot'],
            },
        ),
    ]
