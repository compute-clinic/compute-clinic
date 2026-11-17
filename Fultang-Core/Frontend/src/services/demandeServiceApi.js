import axiosInstance from '../Utils/axiosInstance';
import { getGatewayBaseUrl } from '../Utils/gatewayUrls';

const BASE = () => `${getGatewayBaseUrl()}/personnel/demandes-services`;

export const getDemandesService = async (params = {}) => {
    const response = await axiosInstance.get(`${BASE()}/`, { params });
    return response.data;
};

export const createDemandeService = async (payload) => {
    const response = await axiosInstance.post(`${BASE()}/`, payload);
    return response.data;
};

export const signerDemandeDirecteur = async (id, commentaire_directeur = '') => {
    const response = await axiosInstance.post(`${BASE()}/${id}/signer-directeur/`, { commentaire_directeur });
    return response.data;
};

export const envoyerDemandePlateforme = async (id) => {
    const response = await axiosInstance.post(`${BASE()}/${id}/envoyer-plateforme/`);
    return response.data;
};

export const approuverDemandePlateforme = async (id) => {
    const response = await axiosInstance.post(`${BASE()}/${id}/approuver/`);
    return response.data;
};

export const rejeterDemandeService = async (id, motif_rejet = '') => {
    const response = await axiosInstance.post(`${BASE()}/${id}/rejeter/`, { motif_rejet });
    return response.data;
};

export const STATUT_DEMANDE_LABELS = {
    SOUMISE: 'En attente signature directeur',
    SIGNEE_DIRECTEUR: 'Signée — à envoyer à CompuClinic',
    ENVOYEE_PLATEFORME: 'Chez CompuClinic (plateforme)',
    APPROUVEE: 'Service créé',
    REJETEE: 'Rejetée',
};
