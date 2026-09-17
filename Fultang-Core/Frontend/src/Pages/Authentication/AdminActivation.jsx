import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ShieldCheck, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { AppRoutesPaths as appRouterPaths } from "../../Router/appRouterPaths.js";
import { APP_NAME } from "../../constants/branding.js";
import { usePublicTenantResolution } from "../../hooks/usePublicTenantResolution.js";
import { EstablishmentNotFoundScreen } from "../../GlobalComponents/EstablishmentNotFoundScreen.jsx";
import { PublicTenantIdentity } from "../../GlobalComponents/PublicTenantIdentity.jsx";
import { Loading } from "../../GlobalComponents/Loading.jsx";
import { verifyAdminActivationToken, completeAdminActivation } from "../../services/adminActivationApi.js";

/**
 * Page d'activation du compte administrateur (Cycle de vie du tenant —
 * onboarding admin sécurisé, §4.5 à §4.10 de la mission).
 *
 * Ne CRÉE jamais de compte — l'Admin existe déjà (`compte_active=False`,
 * voir service-personnel/api/views.py::CreateFirstAdminView) : cette page
 * permet uniquement de définir son mot de passe et d'activer ce compte
 * déjà existant, via un lien à usage unique reçu par email.
 *
 * `tenant_id`+`token` viennent de l'URL (composée par tenant-service,
 * voir tenants/views.py::provision_admin) — jamais d'un état choisi côté
 * client. Réutilise `usePublicTenantResolution` (même garde et même
 * identité visuelle que la landing/le login) : si le hostname ne
 * correspond à aucun établissement réel, cette page ne s'affiche pas non
 * plus.
 */
export function AdminActivationPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const tenantId = searchParams.get("tenant_id");
    const token = searchParams.get("token");

    const { checking: checkingTenant, blocked: tenantBlocked, tenant } = usePublicTenantResolution();

    const [status, setStatus] = useState("verifying"); // verifying | invalid | form | success
    const [invalidMessage, setInvalidMessage] = useState("");
    const [adminIdentity, setAdminIdentity] = useState(null);

    const [password, setPassword] = useState("");
    const [passwordConfirm, setPasswordConfirm] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState("");

    useEffect(() => {
        if (!tenantId || !token) {
            setStatus("invalid");
            setInvalidMessage("Ce lien d'activation est invalide.");
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const data = await verifyAdminActivationToken(tenantId, token);
                if (!cancelled) {
                    setAdminIdentity(data);
                    setStatus("form");
                }
            } catch (error) {
                if (cancelled) return;
                const detail = error?.response?.data?.detail;
                setInvalidMessage(typeof detail === "string" ? detail : "Ce lien d'activation est invalide.");
                setStatus("invalid");
            }
        })();
        return () => { cancelled = true; };
    }, [tenantId, token]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError("");
        if (password !== passwordConfirm) {
            setFormError("Les mots de passe ne correspondent pas.");
            return;
        }
        setSubmitting(true);
        try {
            await completeAdminActivation(tenantId, token, password, passwordConfirm);
            setStatus("success");
        } catch (error) {
            const detail = error?.response?.data?.detail;
            setFormError(typeof detail === "string" ? detail : "Impossible d'activer ce compte pour le moment.");
        } finally {
            setSubmitting(false);
        }
    };

    // Empêcher le copier/coller d'un champ à l'autre (confirmation
    // manuelle réelle) — cohérent avec §6 de la mission sur les champs de
    // confirmation critique, appliqué ici par prudence sur la
    // confirmation de mot de passe.
    const blockClipboard = (e) => e.preventDefault();

    if (checkingTenant) return <Loading />;
    if (tenantBlocked) return <EstablishmentNotFoundScreen />;

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="w-full max-w-md">
                <div className="flex flex-col items-center mb-8">
                    {tenant ? (
                        <PublicTenantIdentity tenant={tenant} variant="light" />
                    ) : (
                        <>
                            <div className="bg-gradient-to-r from-primary-start to-primary-end rounded-2xl p-4 shadow-lg mb-4">
                                <ShieldCheck className="w-8 h-8 text-white" />
                            </div>
                            <h1 className="text-2xl font-bold text-secondary">{APP_NAME}</h1>
                        </>
                    )}
                </div>

                <div className="bg-white shadow-2xl border-2 rounded-lg p-8">
                    {status === "verifying" && (
                        <p className="text-center text-gray-500">Vérification du lien d&apos;activation…</p>
                    )}

                    {status === "invalid" && (
                        <>
                            <h2 className="text-xl font-bold text-gray-800 mb-2">{invalidMessage}</h2>
                            <p className="text-sm text-gray-500 mb-6">
                                Contactez votre administrateur ComputeClinic si vous pensez qu&apos;il s&apos;agit d&apos;une erreur.
                            </p>
                            <button
                                type="button"
                                onClick={() => navigate(appRouterPaths.loginPage)}
                                className="text-white text-lg bg-gradient-to-r from-primary-start to-primary-end w-full h-12 rounded-lg font-bold"
                            >
                                Se connecter
                            </button>
                        </>
                    )}

                    {status === "form" && (
                        <>
                            <h2 className="text-xl font-bold text-gray-800 mb-1">Activation de votre compte</h2>
                            <p className="text-sm text-gray-500 mb-6">
                                Définissez vos identifiants pour accéder à votre espace d&apos;administration.
                            </p>

                            <div className="mb-4">
                                <label className="text-sm font-bold text-gray-700 mb-2 block">Nom d&apos;utilisateur</label>
                                <div className="h-12 rounded-lg bg-gray-100 border border-gray-200 flex items-center px-3 text-gray-500">
                                    {adminIdentity?.email}
                                </div>
                            </div>

                            {formError && (
                                <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600">
                                    {formError}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="flex flex-col">
                                <label className="text-sm font-bold text-gray-700 mb-2">Mot de passe</label>
                                <div className="bg-gray-100 border border-gray-200 h-12 rounded-lg mb-4 flex items-center relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        required
                                        minLength={8}
                                        autoComplete="new-password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full h-12 px-3 pr-10 rounded-lg bg-gray-100 border-none outline-none focus:outline-none focus:ring-0"
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword((v) => !v)}
                                        className="absolute right-2 p-2 hover:bg-gray-200 rounded-full transition-all duration-300"
                                        aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5 text-gray-500" /> : <Eye className="w-5 h-5 text-gray-500" />}
                                    </button>
                                </div>

                                <label className="text-sm font-bold text-gray-700 mb-2">Confirmer le mot de passe</label>
                                <div className="bg-gray-100 border border-gray-200 h-12 rounded-lg mb-2 flex items-center relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        required
                                        minLength={8}
                                        autoComplete="new-password"
                                        value={passwordConfirm}
                                        onChange={(e) => setPasswordConfirm(e.target.value)}
                                        onPaste={blockClipboard}
                                        onCopy={blockClipboard}
                                        onCut={blockClipboard}
                                        onDrop={blockClipboard}
                                        className="w-full h-12 px-3 pr-10 rounded-lg bg-gray-100 border-none outline-none focus:outline-none focus:ring-0"
                                        placeholder="••••••••"
                                    />
                                </div>
                                <p className="text-xs text-gray-400 mb-4">8 caractères minimum.</p>

                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="text-white text-lg bg-gradient-to-r from-primary-start to-primary-end w-full h-12 rounded-lg font-bold disabled:opacity-60 disabled:cursor-not-allowed transition-opacity"
                                >
                                    {submitting ? "Activation…" : "Activer mon compte"}
                                </button>
                            </form>
                        </>
                    )}

                    {status === "success" && (
                        <>
                            <div className="flex flex-col items-center text-center mb-4">
                                <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-3" />
                                <h2 className="text-xl font-bold text-gray-800">Votre compte est activé</h2>
                                <p className="text-sm text-gray-500 mt-2">
                                    Vos identifiants ont été configurés avec succès. Vous pouvez maintenant accéder à
                                    votre espace d&apos;administration.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => navigate(appRouterPaths.loginPage)}
                                className="text-white text-lg bg-gradient-to-r from-primary-start to-primary-end w-full h-12 rounded-lg font-bold"
                            >
                                Se connecter
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default AdminActivationPage;
