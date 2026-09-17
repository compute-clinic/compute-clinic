"""
emails.py — Emails du compte administrateur du tenant (Cycle de vie du
tenant, Phase 2 puis onboarding admin sécurisé).

Aucun système d'envoi n'existait nulle part dans FullTang avant la Phase
2 (audit complet du dépôt — aucun `send_mail`, aucun SMTP configuré, voir
MULTITENANT_ARCHITECTURE.md). Ce module utilise l'API Django standard
(`django.core.mail.send_mail`), backée par `EMAIL_BACKEND` (voir
config/settings.py — backend console en développement local, un vrai
SMTP se branche uniquement par variable d'environnement, jamais en dur
ici).

Onboarding admin sécurisé : `send_tenant_admin_welcome_email` ne transmet
PLUS AUCUN mot de passe (ancien comportement, Phase 2) — uniquement un
lien d'activation à usage unique (`AdminActivationToken`, voir
service-personnel/api/models.py). L'administrateur définit lui-même son
mot de passe en l'ouvrant.

Notifications des opérations majeures (mission dédiée) : les fonctions
`send_tenant_*`/`send_service_*` ci-dessous notifient l'administrateur
d'un établissement d'une suspension/réactivation ou d'une désactivation/
activation de service. Toutes best-effort — voir `_send_notification_email`
— une notification manquée ne doit JAMAIS faire échouer l'opération
métier qu'elle signale (§8 de la mission). Aucune donnée sensible
(mot de passe, jeton...) n'est jamais incluse.
"""
import logging

from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger("tenants.emails")


def _send_notification_email(*, recipient_emails, subject, message) -> None:
    """
    Envoi best-effort à chacun des destinataires (jamais groupé dans un
    même `recipient_list` : un administrateur ne doit pas voir l'adresse
    des autres administrateurs du même établissement). Une liste vide
    (aucun compte Admin encore créé pour ce tenant) n'est jamais une
    erreur — simplement rien à notifier.
    """
    if not recipient_emails:
        logger.info("Notification ignorée : aucun administrateur trouvé pour cet établissement.")
        return
    for email in recipient_emails:
        try:
            send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [email], fail_silently=False)
            logger.info("Notification « %s » envoyée à %s.", subject, email)
        except Exception as exc:  # best-effort : ne jamais remonter à l'appelant (§8 de la mission)
            logger.warning("Échec d'envoi de la notification « %s » à %s : %s", subject, email, exc)


def send_tenant_suspended_email(*, tenant_name: str, recipient_emails) -> None:
    _send_notification_email(
        recipient_emails=recipient_emails,
        subject=f"Suspension de votre établissement — {tenant_name}",
        message=(
            f"Votre établissement {tenant_name} a été suspendu.\n\n"
            "Cette opération empêche temporairement l'accès aux services de la plateforme.\n\n"
            "Pour plus d'informations, veuillez contacter l'administrateur de la plateforme.\n\n"
            "— L'équipe ComputeClinic"
        ),
    )


def send_tenant_reactivated_email(*, tenant_name: str, recipient_emails) -> None:
    _send_notification_email(
        recipient_emails=recipient_emails,
        subject=f"Réactivation de votre établissement — {tenant_name}",
        message=(
            f"Votre établissement {tenant_name} a été réactivé.\n\n"
            "L'accès aux services de la plateforme est de nouveau disponible.\n\n"
            "— L'équipe ComputeClinic"
        ),
    )


def send_service_disabled_email(*, tenant_name: str, service_name: str, recipient_emails) -> None:
    _send_notification_email(
        recipient_emails=recipient_emails,
        subject=f"Service désactivé — {service_name} ({tenant_name})",
        message=(
            f"Le service {service_name} de l'établissement {tenant_name} a été désactivé.\n\n"
            "Ce service n'est temporairement plus accessible aux utilisateurs concernés.\n\n"
            "— L'équipe ComputeClinic"
        ),
    )


def send_service_enabled_email(*, tenant_name: str, service_name: str, recipient_emails) -> None:
    _send_notification_email(
        recipient_emails=recipient_emails,
        subject=f"Service réactivé — {service_name} ({tenant_name})",
        message=(
            f"Le service {service_name} de l'établissement {tenant_name} a été réactivé.\n\n"
            "Le service est de nouveau disponible pour les utilisateurs autorisés.\n\n"
            "— L'équipe ComputeClinic"
        ),
    )


def send_tenant_admin_welcome_email(
    *, tenant_name: str, establishment_url: str, admin_email: str, activation_url: str,
) -> None:
    """
    Envoie l'email d'activation au compte administrateur nouvellement créé.

    Ne capture AUCUNE exception : un échec d'envoi doit remonter tel
    quel à l'appelant (`TenantViewSet.provision_admin`), qui le reporte
    comme un sous-échec explicite de la séquence de création — jamais un
    "email envoyé" affiché sans que l'opération d'envoi ait réellement
    été déclenchée avec succès.
    """
    subject = f"Activez votre compte ComputeClinic — {tenant_name}"
    message = (
        f"Bonjour,\n\n"
        f"Votre établissement « {tenant_name} » est prêt sur ComputeClinic.\n\n"
        f"Adresse de votre établissement :\n{establishment_url}\n\n"
        f"Pour accéder à votre espace d'administration, définissez vos "
        f"identifiants en ouvrant le lien ci-dessous :\n{activation_url}\n\n"
        "Ce lien est personnel, à usage unique, et expire après un délai "
        "limité.\n\n"
        "— L'équipe ComputeClinic"
    )
    send_mail(
        subject, message, settings.DEFAULT_FROM_EMAIL, [admin_email],
        fail_silently=False,
    )
    logger.info("Email d'activation envoyé à %s pour l'établissement « %s ».", admin_email, tenant_name)
