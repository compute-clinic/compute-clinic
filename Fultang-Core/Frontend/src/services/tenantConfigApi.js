import axiosInstance from '../Utils/axiosInstance';
import { getGatewayBaseUrl } from '../Utils/gatewayUrls';

/**
 * Configuration de tenant consultable en libre-service par un utilisateur
 * hospitalier authentifié (pas uniquement le Platform Admin) — Cycle de
 * vie du tenant, Phase 2.
 *
 * Consomme GET /tenants/tenants/functional-services/mine/ (tenant-service),
 * qui dérive le tenant de l'appelant depuis son propre JWT (X-Tenant-ID) —
 * jamais un tenant choisi côté client.
 */

/**
 * Liste l'état (activé/désactivé) de chaque service fonctionnel pour
 * l'établissement de l'utilisateur courant.
 * @returns {Promise<Array>} [{code, name, display_order, enabled}, ...]
 */
export const getMyFunctionalServices = async () => {
    const response = await axiosInstance.get(`${getGatewayBaseUrl()}/tenants/tenants/functional-services/mine/`);
    return response.data;
};

/**
 * Profil (nom, logo) de l'établissement de l'utilisateur courant — même
 * principe que getMyFunctionalServices ci-dessus : dérivé du JWT côté
 * backend (GET /tenants/tenants/mine/), jamais choisi côté client. Sert
 * au branding dynamique des sidebars (hooks/useTenantBranding.js).
 * @returns {Promise<{name: string, logo_display_url: string, ...}>}
 */
export const getMyTenant = async () => {
    const response = await axiosInstance.get(`${getGatewayBaseUrl()}/tenants/tenants/mine/`);
    return response.data;
};

/**
 * Identité PUBLIQUE (nom, logo) d'un établissement par son identifiant de
 * sous-domaine — SEUL appel de ce fichier qui fonctionne SANS session
 * (landing/login, avant authentification). Consomme
 * GET /tenants/tenants/public-info/?identifier=..., le seul endpoint
 * public de tenant-service — voir tenants/views.py::TenantViewSet.public_info.
 * Rejette (404) si aucun établissement ne correspond : l'appelant
 * (hooks/usePublicTenantResolution.js) doit alors bloquer l'accès, jamais
 * afficher une landing/un login générique à la place.
 * @param {string} identifier
 * @returns {Promise<{name: string, identifier: string, logo_display_url: string}>}
 */
export const getPublicTenantInfo = async (identifier) => {
    const response = await axiosInstance.get(`${getGatewayBaseUrl()}/tenants/tenants/public-info/`, {
        params: { identifier },
    });
    return response.data;
};
