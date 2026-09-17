import axios from "axios";
import { getGatewayBaseUrl } from "../Utils/gatewayUrls.js";

/**
 * Onboarding admin sécurisé (Cycle de vie du tenant) — appels PUBLICS,
 * avant toute authentification. `axios` brut (pas `axiosInstance`) :
 * comme `PlatformAdminLogin.jsx`, aucun intercepteur de session n'a de
 * sens ici (aucun JWT en jeu à ce stade).
 *
 * Consomme service-personnel via la Gateway (`/personnel/**`) :
 * GET/POST /personnel/activate-admin/verify/ et /activate/ — voir
 * service_personnel/api/views.py::AdminActivationVerifyView/CompleteView.
 */

export const verifyAdminActivationToken = async (tenantId, token) => {
    const response = await axios.get(`${getGatewayBaseUrl()}/personnel/activate-admin/verify/`, {
        params: { tenant_id: tenantId, token },
    });
    return response.data;
};

export const completeAdminActivation = async (tenantId, token, password, passwordConfirm) => {
    const response = await axios.post(`${getGatewayBaseUrl()}/personnel/activate-admin/activate/`, {
        tenant_id: tenantId,
        token,
        password,
        password_confirm: passwordConfirm,
    });
    return response.data;
};
