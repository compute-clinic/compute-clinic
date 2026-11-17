"""Génération du code patient affiché au parcours de soins (accueil → infirmier)."""
from __future__ import annotations

import re
from datetime import date

# Préfixe établissement (CompuClinic / ComputeClinic)
HOSPITAL_CODE = "CC"


def _initials_from_name(nom: str, prenom: str = "") -> str:
    nom_clean = re.sub(r"[^A-Za-zÀ-ÿ]", "", (nom or "")).upper()
    prenom_clean = re.sub(r"[^A-Za-zÀ-ÿ]", "", (prenom or "")).upper()
    if len(nom_clean) >= 2:
        return nom_clean[:2]
    if len(nom_clean) == 1 and prenom_clean:
        return (nom_clean[0] + prenom_clean[0]).ljust(2, "X")
    if len(nom_clean) == 1:
        return nom_clean + "X"
    if len(prenom_clean) >= 2:
        return prenom_clean[:2]
    return "XX"


def generate_patient_code(nom: str, prenom: str = "", on_date: date | None = None) -> str:
    """
    Format : {initiales}-{CC}-{AAMMJJ}-{seq}
    Ex. MB-CC-251002-001 pour Mbarga enregistré le 2 oct. 2025 (1er du jour).
    """
    from .models import Patient

    on_date = on_date or date.today()
    date_part = on_date.strftime("%y%m%d")
    initials = _initials_from_name(nom, prenom)
    prefix = f"{initials}-{HOSPITAL_CODE}-{date_part}"

    existing = Patient.objects.filter(code_identifiant__startswith=f"{prefix}-").count()
    seq = existing + 1
    candidate = f"{prefix}-{seq:03d}"

    # Collision improbable — incrémenter jusqu'à un code libre
    while Patient.objects.filter(code_identifiant=candidate).exists():
        seq += 1
        candidate = f"{prefix}-{seq:03d}"

    return candidate
