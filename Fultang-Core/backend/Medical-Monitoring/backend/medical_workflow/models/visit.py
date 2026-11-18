import uuid
from datetime import timedelta
from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from patient.models.patient import Patient
from .choices import StatutVisite

class Visite(models.Model):
    """
    Dossier de visite (Container) regroupant toutes les prestations médicales 
    effectuées pour un patient lors d'un séjour ou d'un passage à l'hôpital.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    patient = models.ForeignKey(
        Patient, 
        on_delete=models.CASCADE, 
        related_name='visites', 
        verbose_name=_("Patient")
    )
    
    motif_visite = models.TextField(verbose_name=_("Motif global de la visite"))
    date_heure = models.DateTimeField(auto_now_add=True, verbose_name=_("Date et Heure d'ouverture"))
    statut = models.CharField(
        max_length=20, 
        choices=StatutVisite.choices, 
        default=StatutVisite.EN_COURS,
        verbose_name=_("Statut")
    )
    paiement_requis = models.BooleanField(
        default=True,
        verbose_name=_("Passage en caisse requis"),
        help_text=_(
            "Décision de la réception à l'arrivée : True = le patient est envoyé à la caisse "
            "(le médecin ne voit le dossier qu'après règlement et après les paramètres infirmier) ; "
            "False = le patient passe sans caisse. Dans les deux cas, le dossier apparaît d'abord "
            "chez l'infirmier du service."
        ),
    )
    paiement_valide = models.BooleanField(
        default=False,
        verbose_name=_("Paiement consultation validé"),
        help_text=_("RG-CF-001 : validé après encaissement à la caisse."),
    )
    date_paiement = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_("Date de validation du paiement"),
    )
    infirmier_en_charge_id = models.UUIDField(
        null=True,
        blank=True,
        verbose_name=_("Infirmier en charge (triage)"),
    )
    parametres_complets = models.BooleanField(
        default=False,
        verbose_name=_("Paramètres vitaux enregistrés"),
    )
    mode_urgence = models.BooleanField(
        default=False,
        verbose_name=_("Admission urgences / dossier provisoire"),
    )
    medecin_oriente_id = models.UUIDField(
        null=True,
        blank=True,
        verbose_name=_("Médecin orienté (réception)"),
    )
    service_id = models.IntegerField(
        null=True,
        blank=True,
        verbose_name=_("Service hospitalier (id personnel)"),
        help_text=_("Isolation : un soignant d'un autre service ne voit pas ce dossier."),
    )
    service_nom = models.CharField(
        max_length=120,
        blank=True,
        default='',
        verbose_name=_("Nom du service"),
    )

    class Meta:
        verbose_name = _("Visite")
        verbose_name_plural = _("Visites")
        ordering = ['-date_heure']

    def __str__(self):
        return f"Visite de {self.patient.nom} - {self.date_heure.strftime('%d/%m/%Y')}"

    @property
    def delai_validite_heures(self):
        return getattr(settings, 'DELAI_VALIDITE_CONSULTATION_HEURES', 24)

    def paiement_est_actif(self):
        """RG-CF-001 + CORR-A2-002 : paiement valide dans le délai imparti."""
        if not self.paiement_valide or not self.date_paiement:
            return False
        expiration = self.date_paiement + timedelta(hours=self.delai_validite_heures)
        return timezone.now() <= expiration

    def acces_soins_autorise(self):
        """
        Accès médecin / consultation : autorisé si
          - la réception a choisi « passer sans caisse » (paiement_requis=False), ou
          - l'admission est en mode urgence, ou
          - la caisse a validé le paiement et il est encore dans le délai.
        L'infirmier voit le dossier avant cette règle (prise de paramètres).
        """
        if not self.paiement_requis or self.mode_urgence:
            return True
        return self.paiement_est_actif()

    @property
    def etape_parcours(self):
        """Étape lisible du parcours : infirmier d'abord, puis médecin du service."""
        if self.statut != StatutVisite.EN_COURS:
            return self.statut
        if not self.parametres_complets:
            return 'EN_ATTENTE_INFIRMIER'
        if not self.acces_soins_autorise():
            return 'EN_ATTENTE_CAISSE' if not self.paiement_valide else 'PAIEMENT_EXPIRE'
        return 'EN_ATTENTE_MEDECIN'

    @property
    def paiement_expire_le(self):
        if not self.date_paiement:
            return None
        return self.date_paiement + timedelta(hours=self.delai_validite_heures)
