import { useEffect, useState } from "react";
import { getCurrentTenantIdentifier } from "../Utils/gatewayUrls.js";
import { getPublicTenantInfo } from "../services/tenantConfigApi.js";

/**
 * Résout PUBLIQUEMENT (avant toute authentification) le tenant déduit du
 * hostname courant — utilisé par la landing (`/`) et le login (`/login`)
 * pour bloquer l'accès avant leur rendu si le hostname ne correspond à
 * AUCUN établissement réel (Cycle de vie du tenant — accès tenant/landing).
 *
 * Le backend (tenant-service, `GET /tenants/tenants/public-info/`) reste
 * l'autorité : ce hook ne fait jamais que relayer sa réponse, jamais une
 * déduction locale. `identifier` vient de `getCurrentTenantIdentifier()`
 * (déjà utilisé par `gatewayUrls.js` pour le routage API) — jamais une
 * deuxième logique d'extraction du sous-domaine.
 *
 * `hasTenantContext=false` (hostname hors convention — ex. `localhost`
 * sans sous-domaine, utilisé en développement classique) n'est PAS traité
 * comme un tenant inexistant : c'est un cas distinct et déjà établi
 * ailleurs dans ce projet (voir `getGatewayBaseUrl`) où aucune landing
 * tenant n'est même demandée — la landing/le login génériques restent
 * affichés inchangés, comme avant cette phase.
 *
 * Fail-CLOSED : toute erreur (404 confirmé, ou tenant-service injoignable)
 * bloque l'accès (`blocked=true`) — jamais un rendu par défaut faute de
 * certitude, contrairement à `useFunctionalServiceGate` (qui est une
 * simple optimisation d'affichage, le backend appliquant de toute façon
 * la règle réelle ailleurs) : ici, il n'existe AUCUN autre point de
 * contrôle avant que la landing/le login ne s'affichent, donc ce contrôle
 * EST l'application de la règle, pas un confort.
 *
 * @returns {{checking: boolean, blocked: boolean, tenant: object|null, hasTenantContext: boolean}}
 */
export function usePublicTenantResolution() {
    const identifier = getCurrentTenantIdentifier();
    const [checking, setChecking] = useState(Boolean(identifier));
    const [blocked, setBlocked] = useState(false);
    const [tenant, setTenant] = useState(null);

    useEffect(() => {
        if (!identifier) {
            setChecking(false);
            setBlocked(false);
            setTenant(null);
            return;
        }
        let cancelled = false;
        (async () => {
            setChecking(true);
            try {
                const info = await getPublicTenantInfo(identifier);
                if (!cancelled) {
                    setTenant(info);
                    setBlocked(false);
                }
            } catch {
                if (!cancelled) {
                    setTenant(null);
                    setBlocked(true);
                }
            } finally {
                if (!cancelled) setChecking(false);
            }
        })();
        return () => { cancelled = true; };
    }, [identifier]);

    return { checking, blocked, tenant, hasTenantContext: Boolean(identifier) };
}

export default usePublicTenantResolution;
