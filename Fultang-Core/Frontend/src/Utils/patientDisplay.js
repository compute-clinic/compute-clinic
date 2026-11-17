/** Affichage sexe API (M/F) vs formulaire (MASCULIN/FEMININ). */

export const isSexeMasculin = (sexe) => sexe === 'M' || sexe === 'MASCULIN';

export const formatSexeLabel = (sexe) => {
    if (sexe === 'F' || sexe === 'FEMININ') return 'Féminin';
    if (sexe === 'M' || sexe === 'MASCULIN') return 'Masculin';
    return sexe || '—';
};

export const getSexeTagColor = (sexe) => (isSexeMasculin(sexe) ? 'blue' : 'magenta');

export const getPatientContact = (p) =>
    p.contact_principal || p.contact || p.contacts?.[0]?.numero || null;

export const getPatientVille = (p) =>
    p.ville || p.adresse?.ville || null;

/** Nom affiché (identité complète, code anonyme ou matricule). */
export const getPatientDisplayName = (p) => {
    if (!p) return '—';
    const nom = (p.nom || '').trim();
    const prenom = (p.prenom || '').trim();
    if (nom || prenom) return `${nom} ${prenom}`.trim();
    if (p.est_anonyme && p.code_identifiant) return `Patient ${p.code_identifiant}`;
    if (p.code_identifiant) return `Code ${p.code_identifiant}`;
    if (p.matricule) return `Matricule ${p.matricule}`;
    return 'Patient sans identité';
};

/** Initiale pour avatar (évite p.nom[0] sur dossier anonyme). */
export const getPatientInitial = (p) => {
    const label = getPatientDisplayName(p);
    const stripped = label.replace(/^(Patient|Code|Matricule)\s+/i, '');
    const ch = (stripped || label).charAt(0);
    return (ch || '?').toUpperCase();
};

/** Matricule ou code bracelet selon le type de dossier. */
export const getPatientPublicId = (p) => {
    if (!p) return '—';
    if (p.est_anonyme && p.code_identifiant) return p.code_identifiant;
    if (p.matricule) return p.matricule;
    if (p.code_identifiant) return p.code_identifiant;
    return p.id ? `#${p.id}` : '—';
};
