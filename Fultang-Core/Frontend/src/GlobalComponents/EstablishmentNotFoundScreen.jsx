import { SearchX } from "lucide-react";
import { APP_NAME } from "../constants/branding.js";

/**
 * Écran "établissement introuvable" (Cycle de vie du tenant — accès
 * tenant/landing) — affiché à la place de la landing/du login PUBLICS
 * lorsque le hostname ne correspond à AUCUN tenant réel (voir
 * hooks/usePublicTenantResolution.js). Distinct de `NotFound.jsx`
 * (404 de ROUTE générique, ex. URL mal tapée dans l'app) : ici la route
 * existe, c'est l'ÉTABLISSEMENT visé par le sous-domaine qui n'existe pas
 * — même famille visuelle que les autres écrans d'état tenant
 * (`TenantSuspendedScreen.jsx`, `TenantDeletedScreen.jsx`,
 * `ServiceUnavailableScreen.jsx`), jamais le robot/gradient de
 * `NotFound.jsx`, pour rester cohérent avec ces écrans plutôt qu'avec un
 * 404 de navigation.
 */
export function EstablishmentNotFoundScreen() {
    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gray-50 px-4">
            <div className="w-full max-w-md text-center">
                <div className="flex flex-col items-center mb-6">
                    <div className="bg-gradient-to-r from-primary-start to-primary-end rounded-2xl p-4 shadow-lg mb-4">
                        <SearchX className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-secondary">{APP_NAME}</h1>
                </div>
                <div className="bg-white shadow-2xl border-2 rounded-lg p-8">
                    <h2 className="text-xl font-bold text-gray-800">Établissement introuvable.</h2>
                    <p className="text-sm text-gray-500 mt-2">
                        Aucun établissement ne correspond à cette adresse.
                    </p>
                </div>
            </div>
        </div>
    );
}

export default EstablishmentNotFoundScreen;
