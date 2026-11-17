import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CustomDashboard } from "../../GlobalComponents/CustomDashboard.jsx";
import { nurseNavLink } from "./nurseNavLink.js";
import { NurseNavBar } from "./NurseNavBar.jsx";
import { Loading } from "../../GlobalComponents/Loading.jsx";
import { nurseApi } from "../../services/nurseApi.js";
import axiosInstance from "../../Utils/axiosInstance.js";
import { AppRoutesPaths } from "../../Router/appRouterPaths.js";
import { Bed, User, Home, Plus, Activity, ChevronRight, Search, X, CheckCircle2, AlertCircle, BedDouble, MapPin } from 'lucide-react';
import NurseAssignRoomModal from './NurseAssignRoomModal.jsx';

export const NurseHospitalizations = () => {
    const [hospitals, setHospitals] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const navigate = useNavigate();

    const [assignTarget, setAssignTarget] = useState(null);
    const [pasHospiTarget, setPasHospiTarget] = useState(null);
    const [pasHospiMotifType, setPasHospiMotifType] = useState('refus_patient');
    const [pasHospiDetail, setPasHospiDetail] = useState('');
    const [pasHospiSaving, setPasHospiSaving] = useState(false);

    // Care Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [careForm, setCareForm] = useState({
        type_soin: '',
        nom: '',
        motif: '',
        description: '',
        observation: ''
    });

    useEffect(() => {
        loadHospitalizations();
    }, []);

    const loadHospitalizations = async () => {
        try {
            setIsLoading(true);
            const data = await nurseApi.getHospitalizations();
            setHospitals(data);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleConfirmerHospitalise = async (hosp) => {
        if (!window.confirm(`${hosp.patient.nom} ${hosp.patient.prenom} a-t-il effectivement été hospitalisé ?`)) return;
        try {
            await axiosInstance.post(`/hospitalisations/${hosp.id}/confirmer/`);
            await loadHospitalizations();
            setAssignTarget({ ...hosp, statut: 'EN_COURS', needsRoomAssignment: !hosp.room_id });
        } catch (err) {
            alert(err.response?.data?.error || "Impossible de confirmer l'hospitalisation.");
        }
    };

    const MOTIFS_PAS_HOSPI = {
        refus_patient: 'Refus du patient',
        patient_parti: 'Patient parti',
        autre: 'Autre',
    };

    const openPasHospi = (hosp) => {
        setPasHospiTarget(hosp);
        setPasHospiMotifType('refus_patient');
        setPasHospiDetail('');
    };

    const handlePasDHospi = async (e) => {
        e.preventDefault();
        if (!pasHospiTarget) return;
        const libelle = MOTIFS_PAS_HOSPI[pasHospiMotifType] || pasHospiMotifType;
        const detail = pasHospiDetail.trim();
        if (pasHospiMotifType === 'autre' && !detail) {
            alert('Précisez le motif.');
            return;
        }
        const motif = detail ? `${libelle} — ${detail}` : libelle;
        setPasHospiSaving(true);
        try {
            await axiosInstance.post(`/hospitalisations/${pasHospiTarget.id}/pas-d-hospi/`, {
                motif_refus: motif,
            });
            setPasHospiTarget(null);
            await loadHospitalizations();
        } catch (err) {
            alert(err.response?.data?.error || "Impossible d'enregistrer. Réessayez.");
        } finally {
            setPasHospiSaving(false);
        }
    };

    const handleDemanderSortie = async (hospId) => {
        if (!window.confirm('Confirmer la demande de sortie pour ce patient ?')) return;
        try {
            await axiosInstance.post(`/hospitalisations/${hospId}/demander-sortie/`);
            await loadHospitalizations();
        } catch {
            alert('Impossible de lancer la sortie.');
        }
    };

    const handleValiderSortieMedicale = async (hosp) => {
        const type = window.prompt('Type de sortie : AUTORISEE, CONTRE_AVIS ou EVASION', 'AUTORISEE');
        if (!type) return;
        const notes = type !== 'AUTORISEE' ? window.prompt('Notes obligatoires :') : '';
        if (type !== 'AUTORISEE' && !notes?.trim()) {
            alert('Notes requises pour CONTRE_AVIS ou EVASION.');
            return;
        }
        try {
            await axiosInstance.post(`/hospitalisations/${hosp.id}/valider-sortie-medicale/`, {
                type_sortie: type.toUpperCase(),
                notes_sortie: notes || '',
            });
            await loadHospitalizations();
        } catch (err) {
            alert(err.response?.data?.error || 'Validation médicale impossible.');
        }
    };

    const handleOpenCareModal = (patient) => {
        setSelectedPatient(patient);
        setIsModalOpen(true);
    };

    const handleCareSubmit = async (e) => {
        e.preventDefault();
        try {
            setIsSaving(true);
            
            await nurseApi.recordCare({
                ...careForm,
                patientId: selectedPatient.id,
                responsible_person_id: "550e8400-e29b-41d4-a716-446655440000" // Doit être un UUID valide !
            });
            
            setIsModalOpen(false);
            setCareForm({ type_soin: '', nom: '', motif: '', description: '', observation: '' });
            alert("Le soin a été enregistré avec succès !");
        } catch (err) {
            alert("Erreur lors de l'enregistrement du soin.");
        } finally {
            setIsSaving(false);
        }
    };

    const filteredHospitals = hospitals.filter(h => {
        const term = searchTerm.toLowerCase();
        const patientName = `${h.patient.nom} ${h.patient.prenom}`.toLowerCase();
        const roomId = String(h.room_id || '').toLowerCase();
        return patientName.includes(term) || roomId.includes(term);
    });

    return (
        <CustomDashboard linkList={nurseNavLink} requiredRole="nurse">
            <NurseNavBar>
                <div className="p-6 h-[calc(100vh-100px)] flex flex-col bg-gray-50/50 overflow-y-auto scrollbar">
                    
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                                <Bed className="w-7 h-7 mr-2 text-primary-start" />
                                Gestion des Hospitalisations
                            </h2>
                            <p className="text-sm text-gray-500 mt-1">
                                Validez les demandes du médecin (hospitalisé ou non), puis affectez salle et lit.
                            </p>
                        </div>
                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                            <input 
                                type="text" 
                                placeholder="Chercher un patient ou une chambre..."
                                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-start outline-none transition-all"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        {isLoading ? <div className="col-span-full flex justify-center py-12"><Loading /></div> : (
                            filteredHospitals.map((hosp) => (
                                <div key={hosp.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                                    <div className="p-6">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center">
                                                <div className="w-12 h-12 bg-primary-start/10 rounded-full flex items-center justify-center text-primary-start font-bold text-xl mr-4">
                                                    {hosp.patient.nom[0]}
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-bold text-gray-800">{hosp.patient.nom} {hosp.patient.prenom}</h3>
                                                    <p className="text-sm text-gray-500">{hosp.patient.age ? `${hosp.patient.age} ans` : '—'} • {hosp.patient.sexe}</p>
                                                </div>
                                            </div>
                                            <span className={`px-3 py-1 text-[10px] font-bold rounded-full border ${
                                                hosp.needsRoomAssignment
                                                    ? 'bg-amber-50 text-amber-700 border-amber-100'
                                                    : 'bg-green-50 text-green-700 border-green-100'
                                            }`}>
                                                {hosp.statut === 'EN_SORTIE'
                                                    ? 'En cours de sortie'
                                                    : hosp.statut === 'EN_ATTENTE_LIT'
                                                        ? 'Demande médecin — à valider'
                                                        : hosp.needsRoomAssignment
                                                            ? 'En attente d\'affectation'
                                                            : 'Hospitalisé'}
                                            </span>
                                        </div>

                                        {hosp.service && (
                                            <div className="mb-4 flex items-center gap-2 text-sm text-primary-end font-semibold">
                                                <MapPin className="w-4 h-4" />
                                                {hosp.service}
                                            </div>
                                        )}

                                        <div className="grid grid-cols-2 gap-4 mb-6">
                                            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                                                <div className="flex items-center text-xs font-bold text-gray-500 uppercase mb-1">
                                                    <Home className="w-3 h-3 mr-1" /> Salle
                                                </div>
                                                <div className="text-sm font-semibold text-gray-700">
                                                    {hosp.room_id
                                                        ? (hosp.room_nom || `Salle ${String(hosp.room_id).slice(0, 8)}…`)
                                                        : '—'}
                                                </div>
                                            </div>
                                            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                                                <div className="flex items-center text-xs font-bold text-gray-500 uppercase mb-1">
                                                    <BedDouble className="w-3 h-3 mr-1" /> Lit
                                                </div>
                                                <div className="text-sm font-semibold text-gray-700">
                                                    {hosp.numero_lit ? `Lit ${hosp.numero_lit}` : '—'}
                                                </div>
                                            </div>
                                        </div>

                                        {hosp.duree_prevue && (
                                            <div className="mb-4 px-3 py-2 bg-blue-50 rounded-lg border border-blue-100 text-sm">
                                                <span className="font-bold text-blue-700">Durée prévue :</span> <span className="text-blue-600">{hosp.duree_prevue}</span>
                                            </div>
                                        )}

                                        <div className="flex gap-3 flex-wrap">
                                            {hosp.statut === 'EN_ATTENTE_LIT' && (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleConfirmerHospitalise(hosp)}
                                                        className="flex-1 flex items-center justify-center px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold text-sm shadow-sm hover:bg-emerald-700"
                                                    >
                                                        <CheckCircle2 className="w-4 h-4 mr-2" />
                                                        Hospitalisé
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => openPasHospi(hosp)}
                                                        className="flex-1 flex items-center justify-center px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-50"
                                                    >
                                                        <AlertCircle className="w-4 h-4 mr-2" />
                                                        Pas d&apos;hospi
                                                    </button>
                                                </>
                                            )}
                                            {hosp.needsRoomAssignment && hosp.statut !== 'EN_ATTENTE_LIT' && (
                                                <button
                                                    type="button"
                                                    onClick={() => setAssignTarget(hosp)}
                                                    className="flex-1 flex items-center justify-center px-4 py-2 bg-amber-500 text-white rounded-xl font-bold text-sm shadow-sm hover:bg-amber-600 transition-all"
                                                >
                                                    <BedDouble className="w-4 h-4 mr-2" />
                                                    Affecter salle et lit
                                                </button>
                                            )}
                                            {hosp.statut === 'EN_COURS' && hosp.room_id && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleDemanderSortie(hosp.id)}
                                                    className="px-4 py-2 border border-amber-200 text-amber-800 rounded-xl font-bold text-xs"
                                                >
                                                    Demander sortie
                                                </button>
                                            )}
                                            {hosp.statut === 'EN_SORTIE' && !hosp.validation_medicale && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleValiderSortieMedicale(hosp)}
                                                    className="px-4 py-2 bg-amber-500 text-white rounded-xl font-bold text-xs"
                                                >
                                                    Valider sortie médicale
                                                </button>
                                            )}
                                            <button 
                                                onClick={() => handleOpenCareModal(hosp.patient)}
                                                className="flex-1 flex items-center justify-center px-4 py-2 bg-gradient-to-r from-primary-start to-primary-end text-white rounded-xl font-bold text-sm shadow-sm hover:opacity-90 transition-all"
                                            >
                                                <Plus className="w-4 h-4 mr-2" />
                                                Administrer un soin
                                            </button>
                                            <button 
                                                onClick={() => navigate(AppRoutesPaths.patientDetailsPage.replace(':id', hosp.patient.id || "P-4587"))}
                                                className="flex items-center justify-center px-4 py-2 border border-gray-200 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all"
                                            >
                                                <Activity className="w-4 h-4 mr-2 text-gray-400" />
                                                Paramètres
                                            </button>
                                        </div>
                                    </div>
                                    <div className="bg-gray-50/50 p-4 border-t border-gray-100 flex justify-between items-center text-xs text-gray-500">
                                        <span>Admis le : {new Date(hosp.date_entree).toLocaleDateString('fr-FR')}</span>
                                        <button 
                                            onClick={() => navigate(AppRoutesPaths.consultationHistoryPage.replace(':id', hosp.patient.id || "P-4587"))}
                                            className="text-primary-start font-bold hover:underline flex items-center"
                                        >
                                            Voir dossier complet <ChevronRight className="w-3 h-3 ml-1" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {pasHospiTarget && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
                            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                                <div className="bg-slate-700 p-5 text-white flex justify-between items-center">
                                    <div>
                                        <h3 className="text-lg font-bold">Pas d&apos;hospitalisation</h3>
                                        <p className="text-sm opacity-90">
                                            {pasHospiTarget.patient.nom} {pasHospiTarget.patient.prenom}
                                        </p>
                                    </div>
                                    <button type="button" onClick={() => setPasHospiTarget(null)} className="p-2 hover:bg-white/20 rounded-full">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                                <form onSubmit={handlePasDHospi} className="p-5 space-y-4">
                                    <p className="text-sm text-gray-600">
                                        Le motif sera transmis au médecin qui a demandé l&apos;hospitalisation.
                                    </p>
                                    <div className="space-y-2">
                                        {[
                                            ['refus_patient', 'Refus du patient'],
                                            ['patient_parti', 'Patient parti'],
                                            ['autre', 'Autre motif'],
                                        ].map(([value, label]) => (
                                            <label key={value} className="flex items-center gap-2 p-2 rounded-lg border border-gray-100 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="motif_pas_hospi"
                                                    checked={pasHospiMotifType === value}
                                                    onChange={() => setPasHospiMotifType(value)}
                                                />
                                                <span className="text-sm font-medium text-gray-800">{label}</span>
                                            </label>
                                        ))}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                                            Précision {pasHospiMotifType === 'autre' ? '(obligatoire)' : '(optionnelle)'}
                                        </label>
                                        <textarea
                                            className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-primary-start"
                                            rows="3"
                                            value={pasHospiDetail}
                                            onChange={(e) => setPasHospiDetail(e.target.value)}
                                            placeholder="Ex. : le patient a quitté l'établissement avant l'admission…"
                                            required={pasHospiMotifType === 'autre'}
                                        />
                                    </div>
                                    <div className="flex gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setPasHospiTarget(null)}
                                            className="flex-1 py-2 rounded-xl border font-bold text-gray-600"
                                        >
                                            Annuler
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={pasHospiSaving}
                                            className="flex-1 py-2 rounded-xl bg-slate-700 text-white font-bold disabled:opacity-50"
                                        >
                                            {pasHospiSaving ? 'Envoi…' : 'Envoyer au médecin'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    <NurseAssignRoomModal
                        isOpen={Boolean(assignTarget)}
                        hospitalization={assignTarget}
                        onClose={() => setAssignTarget(null)}
                        onAssigned={loadHospitalizations}
                    />

                    {/* Care Administration Modal */}
                    {isModalOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
                            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in-up">
                                <div className="bg-gradient-to-r from-primary-start to-primary-end p-6 text-white flex justify-between items-center">
                                    <div>
                                        <h3 className="text-xl font-bold">Administrer un soin</h3>
                                        <p className="text-sm opacity-90">Patient : {selectedPatient?.nom} {selectedPatient?.prenom}</p>
                                    </div>
                                    <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/20 rounded-full transition-all">
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>
                                <form onSubmit={handleCareSubmit} className="p-6 space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Type de soin</label>
                                            <input 
                                                type="text" 
                                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-start outline-none"
                                                placeholder="Ex: Injection"
                                                value={careForm.type_soin}
                                                onChange={(e) => setCareForm({...careForm, type_soin: e.target.value})}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nom du soin / Médicament</label>
                                            <input 
                                                type="text" 
                                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-start outline-none"
                                                placeholder="Ex: Paracétamol 500mg"
                                                value={careForm.nom}
                                                onChange={(e) => setCareForm({...careForm, nom: e.target.value})}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Motif du soin</label>
                                        <input 
                                            type="text" 
                                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-start outline-none"
                                            placeholder="Ex: Douleurs abdominales"
                                            value={careForm.motif}
                                            onChange={(e) => setCareForm({...careForm, motif: e.target.value})}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Description / Procédure</label>
                                        <textarea 
                                            rows="2"
                                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-start outline-none"
                                            placeholder="Détails de l'administration..."
                                            value={careForm.description}
                                            onChange={(e) => setCareForm({...careForm, description: e.target.value})}
                                        ></textarea>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-amber-600 uppercase mb-1 flex items-center">
                                            <AlertCircle className="w-3.5 h-3.5 mr-1" /> Observations / Signaler une anomalie
                                        </label>
                                        <textarea 
                                            rows="4"
                                            className="w-full px-4 py-2 border border-amber-200 bg-amber-50/30 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                                            placeholder="Réaction du patient, remarques particulières ou signalement d'une anomalie..."
                                            value={careForm.observation}
                                            onChange={(e) => setCareForm({...careForm, observation: e.target.value})}
                                        ></textarea>
                                        <p className="text-[10px] text-gray-400 mt-1 italic">Toute remarque saisie ici sera consignée dans le dossier médical du patient.</p>
                                    </div>
                                    <div className="pt-4">
                                        <button 
                                            type="submit" 
                                            disabled={isSaving}
                                            className="w-full py-3 bg-gradient-to-r from-primary-start to-primary-end text-white font-bold rounded-xl shadow-lg hover:opacity-90 transition-all flex items-center justify-center"
                                        >
                                            {isSaving ? <Loading /> : (
                                                <>
                                                    <CheckCircle2 className="w-5 h-5 mr-2" />
                                                    Enregistrer l'acte médical
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            </NurseNavBar>
        </CustomDashboard>
    );
};

export default NurseHospitalizations;
