"""Journal de traçabilité des accès au dossier patient."""
import uuid

from django.db import models
from django.utils.translation import gettext_lazy as _


class PatientAccessLog(models.Model):
    """Qui a consulté ou modifié quelle ressource patient, et quand."""

    class Action(models.TextChoices):
        READ = "read", _("Consultation fiche patient")
        READ_DOSSIER = "read_dossier", _("Consultation dossier complet")
        READ_EXAMENS = "read_examens", _("Consultation examens patient")
        LIST = "list", _("Liste patients")
        CREATE = "create", _("Création patient")
        UPDATE = "update", _("Modification patient")
        DELETE = "delete", _("Suppression patient")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient = models.ForeignKey(
        "patient.Patient",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="access_logs",
    )
    patient_code = models.CharField(max_length=64, blank=True, default="")
    patient_nom = models.CharField(max_length=200, blank=True, default="")
    user_id = models.CharField(max_length=64, blank=True, default="")
    user_roles = models.CharField(max_length=255, blank=True, default="")
    action = models.CharField(max_length=32, choices=Action.choices)
    resource = models.CharField(max_length=255, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = _("Journal d'accès patient")
        verbose_name_plural = _("Journaux d'accès patient")
        indexes = [
            models.Index(fields=["-created_at"]),
            models.Index(fields=["patient_code"]),
            models.Index(fields=["user_id"]),
        ]

    @classmethod
    def record(cls, request, action, patient=None, resource=""):
        user = getattr(request, "user", None)
        if not user or not getattr(user, "is_authenticated", False):
            return None

        user_id = str(getattr(user, "id", "") or "")
        roles = getattr(user, "roles", None) or []
        if isinstance(roles, list):
            roles_str = ",".join(roles)
        else:
            roles_str = str(roles)

        code = ""
        nom = ""
        patient_id = None
        if patient is not None:
            patient_id = patient.pk
            code = (patient.code_identifiant or patient.matricule or "")[:64]
            nom = f"{patient.nom or ''} {patient.prenom or ''}".strip()[:200]

        return cls.objects.create(
            patient_id=patient_id,
            patient_code=code,
            patient_nom=nom,
            user_id=user_id,
            user_roles=roles_str,
            action=action,
            resource=resource[:255],
        )
