import secrets
import uuid
from datetime import timedelta

from django.db import models
from django.utils import timezone

class GradeInfirmier(models.TextChoices):
    IDE = 'IDE', 'IDE'
    ISP = 'ISP', 'ISP'
    INFIRMIER_ASSISTANT_PRINCIPAL = 'INFIRMIER_ASSISTANT_PRINCIPAL', 'Infirmier Assistant Principal'
    INFIRMIER_ANESTHESISTE = 'INFIRMIER_ANESTHESISTE', 'Infirmier Anesthésiste'
    INFIRMIER_BREVETE = 'INFIRMIER_BREVETE', 'Infirmier Breveté'
    AUTRE = 'AUTRE', 'Autre'

class Langue(models.TextChoices):
    ANGLAIS = 'ANGLAIS', 'Anglais'
    FRANCAIS = 'FRANCAIS', 'Français'
    AUTRES = 'AUTRES', 'Autres'

class NiveauAccreditation(models.TextChoices):
    TECHNICIEN_ASSISTANT = 'TECHNICIEN_ASSISTANT', 'Technicien Assistant'
    CADRE_COMPTABLE = 'CADRE_COMPTABLE', 'Cadre Comptable'
    EXPERT_COMPTABLE = 'EXPERT_COMPTABLE', 'Expert Comptable'
    CERTIFICATIONS_PROFESSIONNELLES = 'CERTIFICATIONS_PROFESSIONNELLES', 'Certifications Professionnelles'
    AUTRE = 'AUTRE', 'Autre'

class SpecialiteLabo(models.TextChoices):
    PARASITOLOGIE_MYCOLOGIE = 'PARASITOLOGIE_MYCOLOGIE', 'Parasitologie Mycologie'
    HEMATOLOGIE = 'HEMATOLOGIE', 'Hématologie'
    BIOCHIMIE_CLINIQUE = 'BIOCHIMIE_CLINIQUE', 'Biochimie Clinique'
    BACTERIOLOGIE_VIROLOGIE = 'BACTERIOLOGIE_VIROLOGIE', 'Bactériologie Virologie'
    IMMUNOLOGIE_SERO_IMMUNOLOGIE = 'IMMUNOLOGIE_SERO_IMMUNOLOGIE', 'Immunologie Séro-Immunologie'
    AUTRE = 'AUTRE', 'Autre'

class Statut(models.TextChoices):
    ACTIF = 'Actif', 'Actif'
    CONGE = 'Congé', 'Congé'
    SUSPENDU = 'Suspendu', 'Suspendu'
    AUTRE = 'Autre', 'Autre'

class Service(models.Model):
    id_service = models.AutoField(primary_key=True)
    nom_service = models.CharField(max_length=100)
    code_analytique = models.CharField(max_length=100)
    desc_service = models.TextField(blank=True, default='')
    chef_service_id = models.UUIDField(null=True, blank=True)
    date_creation = models.DateField(auto_now_add=True)
    date_decret = models.DateField(null=True, blank=True)
    reference_decret = models.CharField(max_length=100, blank=True, default='')

    def __str__(self):
        return self.nom_service


class Prime(models.Model):
    """Prime pouvant couvrir plusieurs services (CORR-A5-008)."""
    id_prime = models.AutoField(primary_key=True)
    personnel_id = models.UUIDField(db_index=True)
    service = models.ForeignKey(Service, on_delete=models.CASCADE, related_name='primes')
    montant_fcfa = models.DecimalField(max_digits=12, decimal_places=2)
    motif = models.CharField(max_length=255, blank=True, default='')
    date_debut = models.DateField()
    date_fin = models.DateField(null=True, blank=True)

    class Meta:
        verbose_name = "Prime"
        verbose_name_plural = "Primes"

    def __str__(self):
        return f"Prime {self.montant_fcfa} FCFA — service {self.service_id}"

class Personnel(models.Model):
    id_personnel = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Tenant (établissement) auquel appartient ce compte — Tenant Registry
    # (tenant-service), pas de ForeignKey : bases de données distinctes.
    # editable=False : DRF exclut automatiquement ce champ de l'écriture sur
    # tous les serializers `fields = '__all__'` existants, donc aucun client
    # ne peut jamais définir son propre tenant_id via l'API CRUD. NULL =
    # compte non encore rattaché à un tenant (pool historique/dev — voir
    # AuthVerifyView) ; ce n'est pas un état définitif, seulement transitoire
    # tant que la phase de provisioning/migration de données n'existe pas.
    tenant_id = models.UUIDField(null=True, blank=True, editable=False, db_index=True)

    nom = models.CharField(max_length=100)
    prenom = models.CharField(max_length=100)
    date_naissance = models.DateField()
    adresse = models.TextField()
    email = models.EmailField()
    contact = models.CharField(max_length=50)
    matricule = models.CharField(max_length=50)
    date_embauche = models.DateField()
    statut = models.CharField(max_length=20, choices=Statut.choices, default=Statut.ACTIF)
    mot_de_passe = models.CharField(max_length=255)

    # Le personnel n'est plus obligé d'appartenir à un service
    service = models.ForeignKey(Service, on_delete=models.SET_NULL, null=True, blank=True, related_name='%(class)s_personnels')

    class Meta:
        abstract = True
        # email/matricule ne sont plus uniques globalement mais par tenant :
        # une même personne dans deux établissements = deux comptes distincts
        # (pas de pool d'utilisateurs partagé entre tenants).
        constraints = [
            models.UniqueConstraint(fields=['tenant_id', 'email'], name='%(app_label)s_%(class)s_unique_email_per_tenant'),
            models.UniqueConstraint(fields=['tenant_id', 'matricule'], name='%(app_label)s_%(class)s_unique_matricule_per_tenant'),
        ]

    def modifierProfil(self):
        pass

    def seConnecter(self):
        return True


class Medecin(Personnel):
    specialite = models.CharField(max_length=100)
    numero_ordre = models.CharField(max_length=50)

class MedecinGeneraliste(Personnel):
    """
    Médecin généraliste : praticien de premier recours sans spécialité restreinte.
    Son rôle dans le système est 'MedecinGeneraliste'.
    """
    numero_ordre = models.CharField(
        max_length=50,
        verbose_name="Numéro d'ordre",
        help_text="Numéro d'inscription à l'Ordre National des Médecins du Cameroun"
    )
    zone_couverte = models.CharField(
        max_length=200,
        blank=True,
        default='',
        verbose_name="Zone couverte",
        help_text="Secteur ou quartier de rattachement du médecin généraliste"
    )

    class Meta:
        verbose_name = "Médecin Généraliste"
        verbose_name_plural = "Médecins Généralistes"

class Infirmiere(Personnel):
    grade = models.CharField(max_length=50, choices=GradeInfirmier.choices)

class Receptionniste(Personnel):
    langues_parlees = models.JSONField(default=list)

class ComptableFinancier(Personnel):
    niveau_accreditation = models.CharField(max_length=100, choices=NiveauAccreditation.choices)

class ComptableMatiere(Personnel):
    pass

class Caissier(Personnel):
    """
    Modèle dédié au poste Caissier (service fonctionnel CAISSE) — avant ce
    correctif, aucun modèle propre n'existait pour ce poste : la création
    d'un « Caissier » via le formulaire Personnel créait en réalité un
    `ComptableFinancier` (bug de mapping, voir POSTE_MODEL_MAP dans
    views.py), routant la personne vers le dashboard Comptabilité
    Financière au lieu du dashboard Caisse.
    """
    pass

class Laborantin(Personnel):
    specialite_labo = models.CharField(max_length=100, choices=SpecialiteLabo.choices)

class Pharmacien(Personnel):
    numero_licence = models.CharField(max_length=100)

class Directeur(Personnel):
    pass

class Admin(Personnel):
    # Onboarding sécurisé de l'administrateur (Cycle de vie du tenant) :
    # `True` par défaut pour ne rien changer au comportement des comptes
    # Admin existants/créés par tout autre chemin — seul le compte créé via
    # `CreateFirstAdminView` (le tout premier admin d'un établissement) est
    # explicitement mis à `False` tant qu'il n'a pas défini son propre mot
    # de passe via `AdminActivationToken`. N'affecte AUCUN autre type de
    # Personnel (champ propre à `Admin`, pas à la base abstraite).
    compte_active = models.BooleanField(default=True)

    # Défini par l'administrateur lui-même pendant l'activation
    # (AdminActivationCompleteView) — ne remplace PAS `email` comme
    # identifiant de connexion (AuthVerifyView continue de matcher par
    # email, inchangé) : uniquement une donnée de profil supplémentaire,
    # affichée/utilisable par l'administrateur. `null=True` : aucun compte
    # Admin existant (créé avant ce champ, ou par un autre chemin que
    # l'onboarding) n'est affecté — la contrainte d'unicité ci-dessous
    # n'empêche jamais deux `NULL` de coexister (comportement standard
    # Postgres, déjà exploité ailleurs dans ce modèle pour `tenant_id`).
    username = models.CharField(max_length=150, blank=True, null=True)

    class Meta(Personnel.Meta):
        # Étend (jamais ne remplace) les contraintes de la base abstraite
        # (email/matricule uniques par tenant) — ajoute la même règle pour
        # `username`, propre à Admin.
        constraints = Personnel.Meta.constraints + [
            models.UniqueConstraint(fields=['tenant_id', 'username'], name='api_admin_unique_username_per_tenant'),
        ]

    def creerCompteUtilisateur(self):
        pass

    def reinitialiserMotDePasse(self):
        pass


def _generate_activation_token():
    return secrets.token_urlsafe(32)


def _default_activation_expiry():
    return timezone.now() + timedelta(hours=72)


class AdminActivationToken(models.Model):
    """
    Token d'activation à usage unique du tout premier compte Admin d'un
    établissement (Cycle de vie du tenant — onboarding admin sécurisé).

    Remplace l'envoi du mot de passe temporaire en clair par email :
    l'Admin définit lui-même son mot de passe en ouvrant ce lien. Ne crée
    JAMAIS de compte — l'Admin existe déjà (`compte_active=False`) au
    moment où ce token est émis ; ce modèle ne fait que permettre de le
    finaliser une seule fois.

    Vit dans la MÊME base tenant que l'`Admin` qu'il protège (app `api`,
    donc routée par `TenantDatabaseRouter` exactement comme `Admin`) —
    la ForeignKey directe est donc sûre (jamais une relation inter-service).
    `tenant_id` est dénormalisé depuis `admin.tenant_id` volontairement :
    l'activation vérifie explicitement la cohérence token/admin/tenant
    (§4.12 de la mission) plutôt que de faire confiance implicitement à la
    relation — défense en profondeur, pas une redondance inutile.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    admin = models.ForeignKey(Admin, on_delete=models.CASCADE, related_name='activation_tokens')
    tenant_id = models.UUIDField(db_index=True)
    token = models.CharField(max_length=64, unique=True, default=_generate_activation_token, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(default=_default_activation_expiry)
    used_at = models.DateTimeField(null=True, blank=True)

    @property
    def is_expired(self) -> bool:
        return timezone.now() >= self.expires_at

    @property
    def is_used(self) -> bool:
        return self.used_at is not None
