import PropTypes from "prop-types";
import { APP_NAME } from "../constants/branding.js";
import { resolveTenantLogoUrl } from "../Utils/gatewayUrls.js";

/**
 * Identité PUBLIQUE d'un établissement (logo + nom), affichée sur la
 * landing (`/`) et le login (`/login`) — AVANT toute authentification.
 *
 * Même principe que `TenantBrandHeader.jsx` (identité de l'établissement
 * en premier, "ComputeClinic" en second, toujours visible) — voir sa
 * docstring — mais :
 *   - reçoit `tenant` en prop (déjà résolu par `usePublicTenantResolution`,
 *     un appel PUBLIC) au lieu d'appeler `useTenantBranding`
 *     (authentifié, réservé à l'espace hospitalier connecté) ;
 *   - propose une variante `light`/`dark` selon le fond de la page hôte,
 *     `TenantBrandHeader` étant lui figé pour un fond de sidebar sombre.
 *
 * N'affiche rien si `tenant` est absent (hostname hors convention, ex.
 * développement classique sur `localhost` sans sous-domaine) — la
 * landing/le login génériques restent alors inchangés.
 */
export function PublicTenantIdentity({ tenant, variant = "light" }) {
    if (!tenant) return null;
    const isDark = variant === "dark";
    const logoUrl = resolveTenantLogoUrl(tenant.logo_display_url);

    return (
        <div className="flex flex-col items-start">
            {logoUrl && (
                <img
                    src={logoUrl}
                    alt="Logo de l'établissement"
                    className="w-14 h-14 rounded-xl object-contain bg-white/90 p-1 mb-2 shadow-sm"
                />
            )}
            <p className={`text-2xl font-bold leading-tight break-words ${isDark ? "text-white" : "text-gray-800"}`}>
                {tenant.name}
            </p>
            <p className={`text-xs font-bold uppercase tracking-widest mt-1 ${isDark ? "text-white/70" : "text-gray-400"}`}>
                {APP_NAME}
            </p>
        </div>
    );
}

PublicTenantIdentity.propTypes = {
    tenant: PropTypes.shape({
        name: PropTypes.string,
        logo_display_url: PropTypes.string,
    }),
    variant: PropTypes.oneOf(["light", "dark"]),
};

export default PublicTenantIdentity;
