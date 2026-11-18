"""
Isolation des dossiers médicaux par service hospitalier.

Un médecin ou un infirmier d'un service ne voit que les visites,
consultations, hospitalisations et patients rattachés à ce service.
La réception, la caisse, la direction, l'admin et les RH voient
l'ensemble de l'établissement (parcours transverse).
"""
from django.db.models import Q

ROLES_ISOLES_PAR_SERVICE = {
    'Medecin',
    'MedecinGeneraliste',
    'Infirmiere',
    'Infirmier',
}

ROLES_TRANSVERSES = {
    'Receptionniste',
    'ComptableFinancier',
    'ComptableMatiere',
    'Directeur',
    'Admin',
    'ResponsableRH',
    'PLATFORM_ADMIN',
    'Laborantin',
    'Pharmacien',
}

ROLES_SOINS = ROLES_ISOLES_PAR_SERVICE
ROLES_MEDECIN = {
    'Medecin',
    'MedecinGeneraliste',
}
ROLES_INFIRMIER = {
    'Infirmiere',
    'Infirmier',
}


def request_roles(request):
    user = getattr(request, 'user', None)
    if user is not None and getattr(user, 'roles', None):
        return [str(r) for r in user.roles]
    raw = request.META.get('HTTP_X_USER_ROLES', '') or ''
    return [r.strip() for r in raw.split(',') if r.strip()]


def request_user_id(request):
    user = getattr(request, 'user', None)
    if user is not None and getattr(user, 'id', None):
        return str(user.id)
    return request.META.get('HTTP_X_USER_ID') or None


def request_service_id(request):
    user = getattr(request, 'user', None)
    sid = getattr(user, 'service_id', None) if user is not None else None
    if sid not in (None, '', 'None'):
        return str(sid)
    header = request.META.get('HTTP_X_USER_SERVICE_ID')
    if header not in (None, '', 'None'):
        return str(header)
    return None


def request_service_nom(request):
    user = getattr(request, 'user', None)
    nom = getattr(user, 'service_nom', None) if user is not None else None
    if nom:
        return str(nom)
    return request.META.get('HTTP_X_USER_SERVICE_NOM') or None


def _service_depuis_personnel(uid):
    """Récupère le service d'un soignant si absent du JWT (anciens tokens / refresh incomplet)."""
    if not uid:
        return None, None
    import json
    import os
    import urllib.error
    import urllib.request
    from django.conf import settings

    base = os.getenv('SERVICE_PERSONNEL_URL', 'http://fultang-personnel:8000').rstrip('/')
    headers = {'Accept': 'application/json'}
    token = getattr(settings, 'TENANT_SERVICE_INTERNAL_TOKEN', '') or ''
    if token:
        headers['X-Internal-Service-Token'] = token
    try:
        req = urllib.request.Request(
            f'{base}/api/personnel/{uid}/',
            headers=headers,
        )
        with urllib.request.urlopen(req, timeout=4) as response:
            if response.status != 200:
                return None, None
            data = json.loads(response.read().decode('utf-8'))
            sid = data.get('service') or data.get('service_id')
            nom = data.get('service_nom') or ''
            return sid, nom
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, ValueError, json.JSONDecodeError):
        return None, None


def est_role_transverse(roles):
    return bool(set(roles) & ROLES_TRANSVERSES)


def est_isole_par_service(roles):
    return bool(set(roles) & ROLES_ISOLES_PAR_SERVICE) and not est_role_transverse(roles)


def est_soignant(roles):
    return bool(set(roles) & ROLES_SOINS) and not est_role_transverse(roles)


def est_medecin(roles):
    return bool(set(roles) & ROLES_MEDECIN) and not est_role_transverse(roles)


def est_infirmier(roles):
    return bool(set(roles) & ROLES_INFIRMIER) and not est_role_transverse(roles)


def filtre_acces_soins(qs):
    """Masque aux médecins les visites envoyées à la caisse et non encore payées (hors urgence)."""
    return qs.filter(
        Q(paiement_requis=False) | Q(mode_urgence=True) | Q(paiement_valide=True)
    )


def _modele_a_le_champ(qs, name):
    return any(f.name == name for f in qs.model._meta.get_fields())


def appliquer_portee_service(qs, request, service_id_field='service_id', service_nom_field='service_nom'):
    """Restreint un queryset au service de l'utilisateur clinique."""
    roles = request_roles(request)
    if not est_isole_par_service(roles):
        return qs

    sid = request_service_id(request)
    nom = request_service_nom(request)
    uid = request_user_id(request)
    if est_isole_par_service(roles) and uid and sid in (None, '', 'None') and not nom:
        sid_pers, nom_pers = _service_depuis_personnel(uid)
        if sid_pers not in (None, ''):
            sid = str(sid_pers)
        if nom_pers:
            nom = str(nom_pers)
    clauses = Q()

    if sid and _modele_a_le_champ(qs, service_id_field):
        try:
            clauses |= Q(**{service_id_field: int(sid)})
        except (TypeError, ValueError):
            pass

    if nom and service_nom_field and _modele_a_le_champ(qs, service_nom_field):
        clauses |= Q(**{f'{service_nom_field}__iexact': nom})

    if uid:
        for field in ('medecin_oriente_id', 'infirmier_en_charge_id', 'doctor_id', 'medecin_charge'):
            if _modele_a_le_champ(qs, field):
                clauses |= Q(**{field: uid})

    # Infirmier : les visites sans service (orientation incomplète) restent
    # visibles pour le triage, sinon le patient disparaît de la salle d'attente.
    if est_infirmier(roles) and _modele_a_le_champ(qs, service_id_field):
        orphan = Q(**{f'{service_id_field}__isnull': True})
        if service_nom_field and _modele_a_le_champ(qs, service_nom_field):
            orphan &= Q(**{service_nom_field: ''}) | Q(**{f'{service_nom_field}__isnull': True})
        clauses |= orphan

    if not clauses:
        return qs.none()
    return qs.filter(clauses).distinct()
