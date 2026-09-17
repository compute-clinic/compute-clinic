"""
internal_clients.py — Appels HTTP internes tenant-service → services métier.

Regroupe le mécanisme d'appel service-to-service déjà utilisé par
`provisioning.py` (`_call_physical_provisioning`, Phase 7) pour que le
Cycle de vie du tenant (Phase 2) puisse l'appeler une seconde fois — vers
un endpoint interne différent (création du premier compte administrateur)
— sans dupliquer la logique HTTP bas niveau (urllib, jeton interne,
gestion d'erreurs).

Aucun nouveau protocole : même jeton partagé
(`TENANT_SERVICE_INTERNAL_TOKEN`), même bibliothèque (`urllib`, stdlib),
même sémantique d'erreur (HTTP/réseau → une exception unique que
l'appelant traduit en échec explicite de sa propre étape, jamais un faux
succès).
"""
import json
import logging
import urllib.error
import urllib.parse
import urllib.request
from typing import List, Optional

from django.conf import settings

logger = logging.getLogger("tenants.internal_clients")


class InternalServiceCallError(Exception):
    """Erreur générique d'appel à un service interne (HTTP ou réseau)."""


def call_internal_service(base_url: str, path: str, payload: dict, timeout: Optional[int] = None) -> dict:
    """
    POST `payload` (JSON) vers `{base_url}/{path}`, authentifié par le
    jeton de service interne partagé.

    Lève InternalServiceCallError sur toute erreur HTTP ou réseau —
    jamais de valeur de repli devinée.
    """
    url = f"{base_url.rstrip('/')}/{path.lstrip('/')}"
    data = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        url,
        data=data,
        headers={
            "X-Internal-Service-Token": settings.TENANT_SERVICE_INTERNAL_TOKEN,
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout or settings.PROVISIONING_TIMEOUT_SECONDS) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        logger.error("Appel interne %s a échoué : HTTP %s", url, exc.code)
        raise InternalServiceCallError(f"{path} a répondu {exc.code} : {body[:300]}") from exc
    except (urllib.error.URLError, TimeoutError) as exc:
        logger.error("Appel interne %s injoignable : %s", url, exc)
        raise InternalServiceCallError(f"{path} injoignable : {exc}") from exc


def call_internal_service_get(base_url: str, path: str, params: dict, timeout: Optional[int] = None) -> dict:
    """
    Variante GET de `call_internal_service` — même jeton interne, mêmes
    règles d'erreur. Ajoutée pour les notifications email des opérations
    majeures (mission dédiée) : `get_tenant_admin_emails` ci-dessous est un
    appel de LECTURE (récupérer des adresses email), jamais une action à
    effet de bord — un POST aurait été sémantiquement incorrect.
    """
    query = urllib.parse.urlencode(params)
    url = f"{base_url.rstrip('/')}/{path.lstrip('/')}?{query}"
    request = urllib.request.Request(
        url,
        headers={"X-Internal-Service-Token": settings.TENANT_SERVICE_INTERNAL_TOKEN},
        method="GET",
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout or settings.PROVISIONING_TIMEOUT_SECONDS) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        logger.error("Appel interne %s a échoué : HTTP %s", url, exc.code)
        raise InternalServiceCallError(f"{path} a répondu {exc.code} : {body[:300]}") from exc
    except (urllib.error.URLError, TimeoutError) as exc:
        logger.error("Appel interne %s injoignable : %s", url, exc)
        raise InternalServiceCallError(f"{path} injoignable : {exc}") from exc


def get_tenant_admin_emails(tenant_id) -> List[str]:
    """
    Récupère les adresses email des comptes Admin d'un tenant, pour les
    notifications email des opérations majeures (mission dédiée) —
    réutilise la relation DÉJÀ existante tenant/administrateur (aucune
    nouvelle adresse stockée dans tenant-service). Réservé au service
    PERSONNEL, seul à connaître les comptes Admin.

    best-effort : retourne une liste VIDE (jamais une exception propagée)
    si l'appel échoue — une notification manquée ne doit jamais faire
    échouer l'opération métier (suspension/réactivation/toggle de service)
    qu'elle est censée signaler (§8 de la mission). Le détail de l'échec
    est journalisé pour investigation.
    """
    base_url = f"{settings.PROVISIONING_SERVICE_PERSONNEL_URL.rstrip('/')}/api"
    try:
        data = call_internal_service_get(base_url, "internal/tenant-admin-emails/", {"tenant_id": str(tenant_id)})
        return data.get("emails", [])
    except InternalServiceCallError as exc:
        logger.warning("Impossible de récupérer les emails admin du tenant %s : %s", tenant_id, exc)
        return []


class AdminProvisioningError(Exception):
    """La création du compte administrateur initial a échoué côté service-personnel."""


def create_first_admin(tenant_id, *, nom: str, prenom: str, email: str) -> dict:
    """
    Appelle POST /api/internal/create-first-admin/ sur service-personnel
    (Cycle de vie du tenant, Phase 2) pour créer le compte administrateur
    initial d'un tenant dont la base PERSONNEL est déjà ACTIVE.

    Retourne le JSON du service ({id, email, activation_token,
    activation_expires_at} — onboarding admin sécurisé, plus de mot de
    passe en clair). Lève AdminProvisioningError sur tout échec — jamais
    un compte "à moitié" créé qu'on prétendrait fonctionnel.
    """
    base_url = f"{settings.PROVISIONING_SERVICE_PERSONNEL_URL.rstrip('/')}/api"
    try:
        return call_internal_service(
            base_url, "internal/create-first-admin/",
            {"tenant_id": str(tenant_id), "nom": nom, "prenom": prenom, "email": email},
        )
    except InternalServiceCallError as exc:
        raise AdminProvisioningError(str(exc)) from exc
