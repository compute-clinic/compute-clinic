# Generated manually for PatientAccessLog

import uuid
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("patient", "0004_patient_code_identifiant"),
    ]

    operations = [
        migrations.CreateModel(
            name="PatientAccessLog",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("patient_code", models.CharField(blank=True, default="", max_length=64)),
                ("patient_nom", models.CharField(blank=True, default="", max_length=200)),
                ("user_id", models.CharField(blank=True, default="", max_length=64)),
                ("user_roles", models.CharField(blank=True, default="", max_length=255)),
                (
                    "action",
                    models.CharField(
                        choices=[
                            ("read", "Consultation fiche patient"),
                            ("read_dossier", "Consultation dossier complet"),
                            ("read_examens", "Consultation examens patient"),
                            ("list", "Liste patients"),
                            ("create", "Création patient"),
                            ("update", "Modification patient"),
                            ("delete", "Suppression patient"),
                        ],
                        max_length=32,
                    ),
                ),
                ("resource", models.CharField(blank=True, default="", max_length=255)),
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                (
                    "patient",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="access_logs",
                        to="patient.patient",
                    ),
                ),
            ],
            options={
                "verbose_name": "Journal d'accès patient",
                "verbose_name_plural": "Journaux d'accès patient",
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="patientaccesslog",
            index=models.Index(fields=["-created_at"], name="patient_pat_created_6a0b0d_idx"),
        ),
        migrations.AddIndex(
            model_name="patientaccesslog",
            index=models.Index(fields=["patient_code"], name="patient_pat_patient_8f3c2a_idx"),
        ),
        migrations.AddIndex(
            model_name="patientaccesslog",
            index=models.Index(fields=["user_id"], name="patient_pat_user_id_4e1b9c_idx"),
        ),
    ]
