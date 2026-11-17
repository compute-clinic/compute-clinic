"""Résolution du nom d'un agent (médecin, etc.) depuis le service personnel."""
import json
import os
import urllib.error
import urllib.request

_CACHE = {}
PERSONNEL_BASE = os.getenv('SERVICE_PERSONNEL_URL', 'http://fultang-personnel:8000').rstrip('/')


def _headers_from_request(request):
    headers = {'Accept': 'application/json'}
    try:
        from django.conf import settings
        token = getattr(settings, 'TENANT_SERVICE_INTERNAL_TOKEN', '') or ''
        if token:
            headers['X-Internal-Service-Token'] = token
    except Exception:
        pass
    if not request:
        return headers
    mapping = {
        'HTTP_X_USER_ID': 'X-User-ID',
        'HTTP_X_USER_ROLES': 'X-User-Roles',
        'HTTP_X_TENANT_ID': 'X-Tenant-ID',
        'HTTP_AUTHORIZATION': 'Authorization',
        'HTTP_X_USER_NOM': 'X-User-Nom',
        'HTTP_X_USER_PRENOM': 'X-User-Prenom',
    }
    for meta_key, header_name in mapping.items():
        value = request.META.get(meta_key)
        if value:
            headers[header_name] = value
    return headers


def nom_depuis_requete(request):
    """Nom du soignant connecté (headers Gateway)."""
    if not request:
        return ''
    nom = (request.META.get('HTTP_X_USER_NOM') or '').strip()
    prenom = (request.META.get('HTTP_X_USER_PRENOM') or '').strip()
    if nom or prenom:
        return f"Dr. {nom} {prenom}".strip()
    return ''


def nom_personnel(personnel_id, request=None):
    """Dr. Nom Prénom pour un UUID personnel — cache court, jamais 'Inconnu' si le nom JWT suffit."""
    if not personnel_id:
        return ''
    key = str(personnel_id)
    if key in _CACHE:
        return _CACHE[key]

    from_jwt = nom_depuis_requete(request)
    user_id = request.META.get('HTTP_X_USER_ID') if request else None
    if from_jwt and user_id and str(user_id) == key:
        _CACHE[key] = from_jwt
        return from_jwt

    try:
        req = urllib.request.Request(
            f"{PERSONNEL_BASE}/api/personnel/{key}/",
            headers=_headers_from_request(request),
        )
        with urllib.request.urlopen(req, timeout=3) as response:
            if response.status == 200:
                data = json.loads(response.read().decode('utf-8'))
                label = f"Dr. {data.get('nom') or ''} {data.get('prenom') or ''}".strip()
                if label and label != 'Dr.':
                    _CACHE[key] = label
                    return label
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, ValueError, json.JSONDecodeError):
        pass
    return from_jwt or ''
