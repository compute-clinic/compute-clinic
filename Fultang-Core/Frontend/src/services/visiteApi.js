import axiosInstance from '../Utils/axiosInstance.js';

/**
 * Visite patient (Medical-Monitoring) — paiement RG-CF-001 / RG-WP-005.
 */

export const getVisitesPatient = async (patientId, filters = {}) => {
    const response = await axiosInstance.get('/visites/', {
        params: { patient: patientId, ...filters },
    });
    const raw = response.data;
    return raw?.results || raw || [];
};

/** Visite EN_COURS non encore payée ou paiement expiré. */
export const getVisiteEnCoursNonPayee = async (patientId) => {
    const visites = await getVisitesPatient(patientId, { statut: 'EN_COURS' });
    return visites.find((v) => !v.paiement_valide || v.paiement_actif === false) || null;
};

export const confirmVisitePaiement = async (visiteId) => {
    const response = await axiosInstance.post(`/visites/${visiteId}/confirmer-paiement/`);
    return response.data;
};

export const prendreVisiteEnCharge = async (visiteId) => {
    const response = await axiosInstance.post(`/visites/${visiteId}/prendre-en-charge/`);
    return response.data;
};

export const confirmerParametresVisite = async (visiteId) => {
    const response = await axiosInstance.post(`/visites/${visiteId}/confirmer-parametres/`);
    return response.data;
};

export const getVisiteById = async (visiteId) => {
    const response = await axiosInstance.get(`/visites/${visiteId}/`);
    return response.data;
};

/**
 * Convertit un RDV en visite concrète (accueil réception) puis clôt le RDV.
 */
export const convertRdvToVisite = async ({
    patientId,
    rdvId,
    motif,
    medecinOrienteId = null,
    modeUrgence = false,
}) => {
    const payload = {
        patient: patientId,
        motif_visite: motif,
        mode_urgence: modeUrgence,
    };
    if (medecinOrienteId) {
        payload.medecin_oriente_id = medecinOrienteId;
    }
    const visiteResponse = await axiosInstance.post('/visites/', payload);
    if (rdvId) {
        try {
            await axiosInstance.patch(`/patient/rendez-vous/${rdvId}/`, { statut: 'TERMINE' });
        } catch (e) {
            console.warn('RDV non clôturé après conversion:', e);
        }
    }
    return visiteResponse.data;
};
