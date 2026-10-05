import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Building2, CheckCircle2, XCircle, ArrowLeft, Save, Loader2, ExternalLink, Ban, RotateCcw, Trash2, AlertTriangle, ChevronDown, ChevronUp, Send, Pencil } from "lucide-react";
import { CustomDashboard } from "../../../GlobalComponents/CustomDashboard.jsx";
import { AppHeader } from "../../../GlobalComponents/AppHeader.jsx";
import { platformAdminNavLink } from "../platformAdminNavLink.js";
import { AppRoutesPaths } from "../../../Router/appRouterPaths.js";
import { getTenant, getPrimaryTenantAdmin, resendTenantAdminActivation, updatePrimaryTenantAdmin, updateTenant, updateTenantStatus, deleteTenantPermanently } from "../../../services/platformAdminApi.js";
import { establishmentConfigCategories } from "./configCategories.js";
import { LogoUploader } from "./LogoUploader.jsx";
import { TechnicalSheet } from "./TechnicalSheet.jsx";
import { ConfirmationModal } from "../../Modals/ConfirmAction.Modal.jsx";
import { useFeedback } from "../../../contexts/FeedbackContext.jsx";
import {
    broadcastTenantSuspended,
    broadcastTenantReactivated,
    broadcastTenantDeleted,
} from "../../../Utils/tenantLifecycleBroadcast.js";

const EMPTY_PROFILE = { address: "", phone: "", email: "" };

/**
 * Page de détail / configuration d'un établissement (tenant) existant.
 *
 * Structure :
 * - En-tête (nom, identifiant, statut)
 * - "Informations générales" : nom/identifiant en lecture seule (jamais
 *   modifiables — l'identifiant est une clé structurante côté backend),
 *   adresse/téléphone/email/logo modifiables via un petit formulaire
 *   inline (PATCH partiel), plus l'URL réelle de l'établissement.
 * - "Configuration technique" : case à cocher du partage des données
 *   cliniques — modification à impact fonctionnel, donc appliquée
 *   uniquement après confirmation explicite (brouillon local +
 *   ConfirmationModal), jamais immédiatement au clic.
 * - "Configuration de l'établissement" : sélecteur de catégories piloté
 *   par le registre `configCategories.js` — une seule catégorie
 *   ("Services") pour cette phase, l'ajout de futures catégories ne
 *   touchera pas ce fichier.
 * - "Fiche technique" : identifiant du tenant et état de ses bases de
 *   données par service plateforme (lecture seule).
 */
export function EstablishmentDetailPage() {
    const { tenantId } = useParams();
    const navigate = useNavigate();
    const { showSuccess, showError } = useFeedback();
    const [tenant, setTenant] = useState(null);
    const [primaryAdmin, setPrimaryAdmin] = useState(null);
    const [adminExpanded, setAdminExpanded] = useState(false);
    const [resendingActivation, setResendingActivation] = useState(false);
    const [editingAdmin, setEditingAdmin] = useState(false);
    const [adminForm, setAdminForm] = useState({ nom: "", prenom: "", email: "", username: "" });
    const [adminSaving, setAdminSaving] = useState(false);
    const [policyAccepted, setPolicyAccepted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");

    // Suppression définitive de l'établissement (Cycle de vie du tenant,
    // Phase 4) — même mécanique de double confirmation que la suspension
    // (§4 ci-dessus), avec en plus une saisie du nom exact du tenant à
    // l'étape 2 (irréversible, jamais un simple clic).
    const [deleteConfirmStep, setDeleteConfirmStep] = useState(0);
    const [deleting, setDeleting] = useState(false);

    const [profileForm, setProfileForm] = useState(EMPTY_PROFILE);
    const [profileSaving, setProfileSaving] = useState(false);

    const [draftExportAllowed, setDraftExportAllowed] = useState(true);
    const [exportSaving, setExportSaving] = useState(false);
    // Double confirmation (Cycle de vie du tenant, Phase 3) : 0 = aucun
    // pop-up, 1 = premier (résumé court, déjà existant, conservé), 2 =
    // second (explicite sur le caractère immédiat de l'effet).
    const [exportConfirmStep, setExportConfirmStep] = useState(0);

    // Suspension / réactivation de l'établissement (Cycle de vie du
    // tenant, Phase 3) — même mécanique de double confirmation.
    const [statusConfirmStep, setStatusConfirmStep] = useState(0);
    const [statusSaving, setStatusSaving] = useState(false);

    const [activeCategoryKey, setActiveCategoryKey] = useState(establishmentConfigCategories[0]?.key);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            setLoadError("");
            try {
                const data = await getTenant(tenantId);
                const admin = await getPrimaryTenantAdmin(tenantId);
                if (!cancelled) {
                    setTenant(data);
                    setPrimaryAdmin(admin);
                    setAdminForm(admin ? { nom: admin.nom || "", prenom: admin.prenom || "", email: admin.email || "", username: admin.username || "" } : { nom: "", prenom: "", email: "", username: "" });
                    setPolicyAccepted(Boolean(data.clinical_data_sharing_policy_accepted));
                    setProfileForm({
                        address: data.address || "",
                        phone: data.phone || "",
                        email: data.email || "",
                    });
                    setDraftExportAllowed(Boolean(data.allow_clinical_agent_export));
                }
            } catch (error) {
                console.error("Erreur de chargement de l'établissement:", error);
                if (!cancelled) setLoadError("Impossible de charger cet établissement pour le moment.");
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [tenantId]);

    const handleProfileSave = async () => {
        setProfileSaving(true);
        try {
            const updated = await updateTenant(tenantId, profileForm);
            setTenant(updated);
            showSuccess("Configuration mise à jour");
        } catch (error) {
            console.error("Erreur lors de la mise à jour des informations générales:", error);
            showError("Impossible d'enregistrer ces informations");
        } finally {
            setProfileSaving(false);
        }
    };

    const hasExportChange = tenant ? draftExportAllowed !== Boolean(tenant.allow_clinical_agent_export) : false;

    const handleExportConfirmed = async () => {
        setExportSaving(true);
        try {
            const updated = await updateTenant(tenantId, {
                allow_clinical_agent_export: draftExportAllowed,
                clinical_data_sharing_policy_accepted: policyAccepted,
            });
            setTenant(updated);
            setDraftExportAllowed(Boolean(updated.allow_clinical_agent_export));
            showSuccess("Configuration mise à jour");
        } catch (error) {
            console.error("Erreur lors de la mise à jour du partage des données cliniques:", error);
            showError("Impossible de modifier la configuration");
        } finally {
            setExportSaving(false);
            setExportConfirmStep(0);
        }
    };

    const cancelExportChange = () => {
        setExportConfirmStep(0);
        setDraftExportAllowed(Boolean(tenant?.allow_clinical_agent_export));
        setPolicyAccepted(Boolean(tenant?.clinical_data_sharing_policy_accepted));
    };

    const beginExportChange = () => {
        if (draftExportAllowed && !policyAccepted) {
            showError("Veuillez accepter la politique avant d’activer le partage.");
            return;
        }
        setExportConfirmStep(1);
    };

    const handleResendActivation = async () => {
        setResendingActivation(true);
        try {
            await resendTenantAdminActivation(tenantId, primaryAdmin?.email);
            showSuccess("Email d’activation renvoyé");
        } catch (error) {
            showError(error?.response?.data?.detail || "Impossible de renvoyer l’email d’activation");
        } finally { setResendingActivation(false); }
    };

    const handleAdminSave = async () => {
        setAdminSaving(true);
        try {
            const updated = await updatePrimaryTenantAdmin(tenantId, adminForm);
            setPrimaryAdmin(updated);
            setAdminForm({ nom: updated.nom || "", prenom: updated.prenom || "", email: updated.email || "", username: updated.username || "" });
            setEditingAdmin(false);
            showSuccess("Informations de l’administrateur mises à jour");
        } catch (error) {
            const data = error?.response?.data;
            const message = data?.email?.[0] || data?.username?.[0] || data?.detail || "Impossible de modifier l’administrateur";
            showError(message);
        } finally { setAdminSaving(false); }
    };

    const isTenantActive = tenant?.status === "ACTIVE";
    const targetTenantStatus = isTenantActive ? "INACTIVE" : "ACTIVE";

    const handleStatusConfirmed = async () => {
        setStatusSaving(true);
        try {
            // La saisie manuelle (requireTypedConfirmation ci-dessous) a déjà
            // forcé typedValue === tenant.name avant que ce bouton ne soit
            // seulement cliquable — envoyer directement tenant.name au
            // backend est donc strictement équivalent, sans avoir à faire
            // remonter la valeur saisie hors de ConfirmationModal.
            const confirmation = targetTenantStatus === "INACTIVE" ? tenant.name : undefined;
            const updated = await updateTenantStatus(tenantId, targetTenantStatus, confirmation);
            setTenant(updated);
            // Propagation immédiate (même origine, voir tenantLifecycleBroadcast.js)
            // vers un onglet hospitalier déjà ouvert sur ce tenant — réutilise
            // l'écran de blocage déjà existant, sans attendre sa prochaine
            // requête ou un rafraîchissement.
            if (targetTenantStatus === "INACTIVE") {
                broadcastTenantSuspended(tenantId);
            } else {
                broadcastTenantReactivated(tenantId);
            }
            showSuccess(targetTenantStatus === "INACTIVE" ? "Établissement suspendu" : "Établissement réactivé");
        } catch (error) {
            console.error("Erreur lors du changement de statut de l'établissement:", error);
            showError("Impossible de modifier le statut de cet établissement");
        } finally {
            setStatusSaving(false);
            setStatusConfirmStep(0);
        }
    };

    const handleDeleteConfirmed = async () => {
        setDeleting(true);
        try {
            await deleteTenantPermanently(tenantId, tenant.name);
            // Idem : propagation immédiate même origine avant même la
            // redirection Platform Admin.
            broadcastTenantDeleted(tenantId);
            showSuccess("Établissement supprimé définitivement");
            navigate(AppRoutesPaths.platformAdminEstablishmentsPage);
        } catch (error) {
            console.error("Erreur lors de la suppression définitive de l'établissement:", error);
            const backendMessage = error?.response?.data?.detail;
            showError(typeof backendMessage === "string" ? backendMessage : "Impossible de supprimer définitivement cet établissement");
        } finally {
            setDeleting(false);
            setDeleteConfirmStep(0);
        }
    };

    const activeCategory = establishmentConfigCategories.find((c) => c.key === activeCategoryKey);

    return (
        <CustomDashboard linkList={platformAdminNavLink} requiredRole="platform_admin" brandLabel="ComputeClinic Platform" showTenantIdentity={false}>
            <AppHeader subtitle="Platform Admin" title={tenant?.name || "Établissement"} />
            <div className="p-6 bg-gray-50 min-h-screen">
                <Link
                    to={AppRoutesPaths.platformAdminEstablishmentsPage}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-primary-start mb-4 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Retour aux établissements
                </Link>

                {loadError && (
                    <div className="mb-6 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm font-semibold text-red-600">
                        {loadError}
                    </div>
                )}

                {loading ? (
                    <div className="animate-pulse space-y-4">
                        <div className="h-24 bg-gray-100 rounded-xl" />
                        <div className="h-48 bg-gray-100 rounded-xl" />
                        <div className="h-48 bg-gray-100 rounded-xl" />
                    </div>
                ) : tenant ? (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="flex flex-col gap-6"
                    >
                        {/* En-tête */}
                        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="bg-primary-start/10 rounded-full p-3">
                                    <Building2 className="w-6 h-6 text-primary-start" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-800">{tenant.name}</h2>
                                    <p className="text-sm text-gray-500">{tenant.identifier}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold w-fit ${tenant.status === "ACTIVE" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"
                                        }`}
                                >
                                    {tenant.status === "ACTIVE" ? (
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                    ) : (
                                        <XCircle className="w-3.5 h-3.5" />
                                    )}
                                    {tenant.status === "ACTIVE" ? "Actif" : "Inactif"}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setStatusConfirmStep(1)}
                                    disabled={statusSaving}
                                    className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border transition-colors disabled:opacity-50 ${isTenantActive
                                            ? "border-red-200 text-red-500 hover:bg-red-50"
                                            : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                                        }`}
                                >
                                    {statusSaving ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : isTenantActive ? (
                                        <Ban className="w-3.5 h-3.5" />
                                    ) : (
                                        <RotateCcw className="w-3.5 h-3.5" />
                                    )}
                                    {isTenantActive ? "Suspendre l'établissement" : "Réactiver l'établissement"}
                                </button>
                            </div>
                        </div>

                        <ConfirmationModal
                            isOpen={statusConfirmStep === 1}
                            onClose={() => setStatusConfirmStep((step) => (step === 1 ? 0 : step))}
                            onConfirm={() => setStatusConfirmStep(2)}
                            title={isTenantActive ? "Voulez-vous suspendre cet établissement ?" : "Voulez-vous réactiver cet établissement ?"}
                            message="Une confirmation supplémentaire vous sera demandée."
                            confirmText="Continuer"
                            cancelText="Annuler"
                        />
                        <ConfirmationModal
                            isOpen={statusConfirmStep === 2}
                            onClose={() => setStatusConfirmStep(0)}
                            onConfirm={handleStatusConfirmed}
                            title={isTenantActive ? "Voulez-vous vraiment suspendre cet établissement ?" : "Voulez-vous vraiment réactiver cet établissement ?"}
                            message={isTenantActive
                                ? <p className="text-red-600 font-bold">Les utilisateurs de cet établissement ne pourront plus accéder à la plateforme tant que l&apos;établissement restera suspendu.</p>
                                : "Cette action rétablira immédiatement l'accès à ComputeClinic pour les utilisateurs de cet établissement."}
                            confirmText={isTenantActive ? "Oui, suspendre l'établissement" : "Oui, réactiver l'établissement"}
                            cancelText="Annuler"
                            requireTypedConfirmation={isTenantActive ? tenant.name : null}
                        />

                        {tenant.establishment_url && (
                            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4 flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">
                                        URL de l&apos;établissement
                                    </span>
                                    <p className="text-sm font-semibold text-gray-800 truncate">
                                        {tenant.establishment_url}
                                    </p>
                                </div>
                                <a
                                    href={tenant.establishment_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 text-primary-start hover:text-primary-end text-sm font-bold whitespace-nowrap flex-shrink-0"
                                >
                                    Ouvrir
                                    <ExternalLink className="w-4 h-4" />
                                </a>
                            </div>
                        )}

                        {/* Informations générales */}
                        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Informations générales</h3>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Nom</label>
                                    <p className="h-11 flex items-center px-3 rounded-lg bg-gray-100 text-gray-600 text-sm">
                                        {tenant.name}
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1">
                                        Identifiant
                                    </label>
                                    <p className="h-11 flex items-center px-3 rounded-lg bg-gray-100 text-gray-600 text-sm">
                                        {tenant.identifier}
                                    </p>
                                </div>
                            </div>

                            {primaryAdmin && (
                                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 mb-4">
                                    <div className="flex items-center justify-between gap-4">
                                        <div>
                                            <span className="block text-xs font-bold text-gray-400 uppercase mb-1">
                                                Administrateur du tenant
                                            </span>
                                            <span className="block text-sm font-semibold text-gray-800">
                                                {[primaryAdmin.prenom, primaryAdmin.nom].filter(Boolean).join(" ")}
                                            </span>
                                            <span className="block text-sm text-gray-500">{primaryAdmin.email}</span>
                                        </div>
                                        <div className="flex items-center gap-1"><button type="button" onClick={() => setEditingAdmin((value) => !value)} className="inline-flex items-center gap-1 p-2 text-xs font-semibold text-gray-500 hover:text-primary-start" aria-label="Modifier l’administrateur"><Pencil className="w-4 h-4" /><span className="hidden sm:inline">Modifier</span></button><button type="button" onClick={() => setAdminExpanded((value) => !value)} className="p-2 text-gray-500 hover:text-primary-start" aria-expanded={adminExpanded} aria-label="Afficher les détails de l’administrateur">{adminExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}</button></div>
                                    </div>
                                    {editingAdmin && <div className="mt-3 pt-3 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-3"><input value={adminForm.nom} onChange={(e) => setAdminForm((form) => ({ ...form, nom: e.target.value }))} placeholder="Nom" className="h-10 px-3 rounded-lg border border-gray-200 text-sm" /><input value={adminForm.prenom} onChange={(e) => setAdminForm((form) => ({ ...form, prenom: e.target.value }))} placeholder="Prénom" className="h-10 px-3 rounded-lg border border-gray-200 text-sm" /><input value={adminForm.email} onChange={(e) => setAdminForm((form) => ({ ...form, email: e.target.value }))} placeholder="Email" type="email" className="h-10 px-3 rounded-lg border border-gray-200 text-sm" /><input value={adminForm.username} onChange={(e) => setAdminForm((form) => ({ ...form, username: e.target.value }))} placeholder="Username" className="h-10 px-3 rounded-lg border border-gray-200 text-sm" /><div className="sm:col-span-2 flex justify-end gap-2"><button type="button" onClick={() => setEditingAdmin(false)} className="px-3 py-2 text-xs font-semibold text-gray-500">Annuler</button><button type="button" onClick={handleAdminSave} disabled={adminSaving} className="px-3 py-2 text-xs font-bold text-white rounded-lg bg-primary-end disabled:opacity-50">{adminSaving ? "Enregistrement…" : "Enregistrer"}</button></div></div>}
                                    {adminExpanded && <div className="mt-3 pt-3 border-t border-gray-200"><div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-gray-600"><span><b>Username :</b> {primaryAdmin.username || "Non défini"}</span><span><b>Rôle :</b> {primaryAdmin.role}</span><span><b>Statut :</b> {primaryAdmin.account_status === "ACTIVE" ? "Actif" : "En attente d’activation"}</span></div>{primaryAdmin.activation_pending && <button type="button" onClick={handleResendActivation} disabled={resendingActivation} className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-primary-start disabled:opacity-50">{resendingActivation ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}Renvoyer l’email d’activation</button>}</div>}
                                </div>
                            )}

                            <div className="mb-4">
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">Adresse</label>
                                <textarea
                                    value={profileForm.address}
                                    onChange={(e) => setProfileForm((p) => ({ ...p, address: e.target.value }))}
                                    rows={2}
                                    className="w-full px-3 py-2 rounded-lg bg-gray-100 border border-gray-200 outline-none focus:ring-2 focus:ring-primary-end resize-none text-sm"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Téléphone</label>
                                    <input
                                        type="text"
                                        value={profileForm.phone}
                                        onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))}
                                        className="w-full h-11 px-3 rounded-lg bg-gray-100 border border-gray-200 outline-none focus:ring-2 focus:ring-primary-end text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Email</label>
                                    <input
                                        type="email"
                                        value={profileForm.email}
                                        onChange={(e) => setProfileForm((p) => ({ ...p, email: e.target.value }))}
                                        className="w-full h-11 px-3 rounded-lg bg-gray-100 border border-gray-200 outline-none focus:ring-2 focus:ring-primary-end text-sm"
                                    />
                                </div>
                            </div>

                            <div className="mb-4">
                                <LogoUploader tenant={tenant} onUpdated={setTenant} />
                            </div>

                            <div className="flex justify-end">
                                <button
                                    type="button"
                                    onClick={handleProfileSave}
                                    disabled={profileSaving}
                                    className="inline-flex items-center gap-2 text-white font-bold px-5 py-2.5 rounded-lg bg-gradient-to-r from-primary-start to-primary-end disabled:opacity-50 transition-opacity"
                                >
                                    {profileSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Enregistrer
                                </button>
                            </div>
                        </div>

                        {/* Configuration technique */}
                        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Configuration technique</h3>

                            <div className="rounded-lg border border-gray-200 p-4 bg-gray-50 mb-3">
                                <p className="text-xs leading-5 text-gray-600 mb-4">Le partage est volontaire et limité aux données anonymisées prévues pour les outils d’aide à la décision clinique de la plateforme. Il ne donne pas un accès général aux données de l’établissement. Lorsqu’elles sont conservées par le système, les informations gardent leur provenance ; l’accès reste limité au fonctionnement prévu par la plateforme.</p>
                                <label className="flex items-start gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={draftExportAllowed}
                                        disabled={exportSaving}
                                        onChange={(e) => setDraftExportAllowed(e.target.checked)}
                                        className="mt-0.5 w-5 h-5 rounded border-gray-300 text-primary-end focus:ring-primary-end accent-primary-end cursor-pointer flex-shrink-0 disabled:cursor-not-allowed"
                                    />
                                    <span>
                                        <span className="block text-sm font-bold text-gray-800">
                                            Activer le partage des données cliniques
                                        </span>
                                        <span className="block text-xs text-gray-500 mt-1">
                                            Les données médicales anonymisées de cet établissement pourront être
                                            partagées avec les outils d&apos;aide à la décision clinique de la
                                            plateforme.
                                        </span>
                                    </span>
                                </label>
                                <label className="mt-4 pt-4 border-t border-gray-200 flex items-start gap-3 cursor-pointer">
                                    <input type="checkbox" checked={policyAccepted} disabled={exportSaving} onChange={(e) => setPolicyAccepted(e.target.checked)} className="mt-0.5 w-5 h-5 rounded border-gray-300 text-primary-end focus:ring-primary-end accent-primary-end" />
                                    <span className="text-xs leading-5 text-gray-700">J’ai pris connaissance de cette politique et j’accepte explicitement l’autorisation dans le périmètre décrit.</span>
                                </label>
                            </div>

                            {hasExportChange && (
                                <div className="flex justify-end">
                                    <button
                                        type="button"
                                        onClick={beginExportChange}
                                        disabled={exportSaving}
                                        className="inline-flex items-center gap-2 text-white font-bold px-5 py-2.5 rounded-lg bg-gradient-to-r from-primary-start to-primary-end disabled:opacity-50 transition-opacity"
                                    >
                                        {exportSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                        Enregistrer
                                    </button>
                                </div>
                            )}

                            <ConfirmationModal
                                isOpen={exportConfirmStep === 1}
                                onClose={cancelExportChange}
                                onConfirm={() => setExportConfirmStep(2)}
                                title={draftExportAllowed ? "Confirmer l’activation" : "Désactiver le partage des données cliniques ?"}
                                message={draftExportAllowed
                                    ? "Le partage des données cliniques sera autorisé pour le périmètre prévu par la plateforme."
                                    : "L’établissement cessera d’alimenter le mécanisme de partage/export pour les échanges futurs prévus par la plateforme. Cette désactivation ne supprime pas nécessairement des données déjà transmises ou déjà traitées."}
                                confirmText="Continuer"
                                cancelText="Annuler"
                                closeAfterConfirm={false}
                            />
                            <ConfirmationModal
                                isOpen={exportConfirmStep === 2}
                                onClose={cancelExportChange}
                                onConfirm={handleExportConfirmed}
                                title={draftExportAllowed
                                    ? "Voulez-vous vraiment autoriser le partage des données cliniques ?"
                                    : "Voulez-vous vraiment désactiver le partage des données cliniques ?"}
                                message={draftExportAllowed
                                    ? "Cette action autorisera immédiatement le partage des données cliniques anonymisées de cet établissement."
                                    : "Confirmez que vous comprenez que seules les transmissions futures sont arrêtées ; cette action ne supprime pas les données déjà traitées."}
                                confirmText={draftExportAllowed ? "Oui, autoriser" : "Oui, désactiver"}
                                cancelText="Annuler"
                                requireTypedConfirmation={draftExportAllowed ? null : "DESACTIVER"}
                                acknowledgementLabel={draftExportAllowed ? null : "Je confirme avoir lu et compris les conséquences de la désactivation du partage des données cliniques."}
                                closeAfterConfirm={false}
                            />
                        </div>

                        {/* Configuration de l'établissement (registre de catégories) */}
                        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
                            <h3 className="text-lg font-semibold text-gray-800 mb-1">
                                Configuration de l&apos;établissement
                            </h3>
                            <p className="text-sm text-gray-500 mb-4">
                                Fonctionnalités et réglages propres à cet établissement.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-6">
                                <nav className="flex sm:flex-col gap-1.5 sm:w-56 flex-shrink-0 overflow-x-auto">
                                    {establishmentConfigCategories.map((category) => {
                                        const CategoryIcon = category.icon;
                                        const isActive = category.key === activeCategoryKey;
                                        return (
                                            <button
                                                key={category.key}
                                                type="button"
                                                onClick={() => setActiveCategoryKey(category.key)}
                                                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold text-left whitespace-nowrap transition-colors ${isActive
                                                        ? "bg-primary-start/10 text-primary-start"
                                                        : "text-gray-500 hover:bg-gray-50"
                                                    }`}
                                            >
                                                {CategoryIcon && <CategoryIcon className="w-4 h-4 flex-shrink-0" />}
                                                {category.label}
                                            </button>
                                        );
                                    })}
                                </nav>

                                <div className="flex-1 min-w-0">
                                    {activeCategory && (
                                        <>
                                            <p className="text-xs text-gray-400 mb-3">{activeCategory.description}</p>
                                            <activeCategory.Component tenantId={tenantId} />
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Fiche technique */}
                        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Fiche technique</h3>
                            <TechnicalSheet tenantId={tenantId} />
                        </div>

                        {/* Zone de danger : suppression définitive (Cycle de vie du tenant, Phase 4) */}
                        <div className="bg-white rounded-xl shadow-md border border-red-200 p-6">
                            <h3 className="text-lg font-semibold text-red-600 mb-1 flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5" />
                                Zone de danger
                            </h3>
                            <p className="text-sm text-gray-500 mb-4">
                                Contrairement à la suspension (réversible, tout est conservé), la suppression
                                définitive efface irréversiblement les données de cet établissement.
                            </p>
                            <button
                                type="button"
                                onClick={() => setDeleteConfirmStep(1)}
                                disabled={deleting}
                                className="inline-flex items-center gap-2 text-sm font-bold px-4 py-2.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                            >
                                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                Supprimer définitivement
                            </button>
                        </div>

                        <ConfirmationModal
                            isOpen={deleteConfirmStep === 1}
                            onClose={() => setDeleteConfirmStep((step) => (step === 1 ? 0 : step))}
                            onConfirm={() => setDeleteConfirmStep(2)}
                            title="Supprimer définitivement cet établissement ?"
                            message={
                                <p>
                                    Les données de cet établissement seront archivées avant sa suppression définitive. Cette action est irréversible.
                                </p>
                            }
                            confirmText="Continuer"
                            cancelText="Annuler"
                        />
                        <ConfirmationModal
                            isOpen={deleteConfirmStep === 2}
                            onClose={() => setDeleteConfirmStep(0)}
                            onConfirm={handleDeleteConfirmed}
                            title="Confirmer la suppression définitive"
                            message={<p className="text-red-600 font-bold">Cette action ne peut pas être annulée.</p>}
                            confirmText="Oui, supprimer définitivement"
                            cancelText="Annuler"
                            requireTypedConfirmation={tenant.name}
                        />
                    </motion.div>
                ) : null}
            </div>
        </CustomDashboard>
    );
}

export default EstablishmentDetailPage;
