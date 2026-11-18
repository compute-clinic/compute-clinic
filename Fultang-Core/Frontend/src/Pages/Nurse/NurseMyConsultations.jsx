import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CustomDashboard } from "../../GlobalComponents/CustomDashboard.jsx";
import { nurseNavLink } from "./nurseNavLink.js";
import { NurseNavBar } from "./NurseNavBar.jsx";
import { Loading } from "../../GlobalComponents/Loading.jsx";
import { nurseApi } from "../../services/nurseApi.js";
import { AppRoutesPaths } from "../../Router/appRouterPaths.js";
import { ClipboardList, RefreshCw, ChevronRight } from 'lucide-react';

export const NurseMyConsultations = () => {
    const [visites, setVisites] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const load = async () => {
        try {
            setIsLoading(true);
            setError("");
            const data = await nurseApi.getMyConsultations();
            setVisites(data);
        } catch {
            setError("Impossible de charger vos consultations.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const formatTime = (isoString) => {
        if (!isoString) return "—";
        return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const openHistory = (patientId) => {
        navigate(AppRoutesPaths.consultationHistoryPage.replace(':id', patientId));
    };

    return (
        <CustomDashboard linkList={nurseNavLink} requiredRole="nurse">
            <NurseNavBar>
                <div className="p-6 h-[calc(100vh-100px)] flex flex-col bg-gray-50/50">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800">Mes consultations</h2>
                            <p className="text-sm text-gray-500 mt-1">
                                Patients dont le triage est terminé — en attente ou en cours chez le médecin
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={load}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Actualiser
                        </button>
                    </div>

                    {error && (
                        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded shadow-sm mb-6">
                            {error}
                        </div>
                    )}

                    {isLoading ? (
                        <div className="flex-1 flex justify-center items-center">
                            <Loading />
                        </div>
                    ) : visites.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-500 bg-white rounded-xl border border-dashed border-gray-200">
                            <ClipboardList className="w-12 h-12 text-gray-300 mb-3" />
                            <p className="font-medium">Aucune consultation en cours</p>
                            <p className="text-sm mt-1">Les dossiers apparaissent ici après enregistrement des paramètres vitaux.</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3 overflow-y-auto">
                            {visites.map((item) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => openHistory(item.patient.id)}
                                    className="w-full text-left bg-white border border-gray-200 rounded-xl p-4 hover:border-primary-start/40 hover:shadow-md transition-all flex items-center justify-between group"
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                                        <div>
                                            <span className="font-semibold text-gray-900">
                                                {item.patient.nom} {item.patient.prenom}
                                            </span>
                                            <span className="text-sm text-primary-end font-mono font-semibold ml-2">
                                                {item.patient.code_identifiant || item.patient.matricule}
                                            </span>
                                        </div>
                                        <span className="text-xs font-medium px-2 py-1 rounded-full bg-emerald-50 text-emerald-700">
                                            Triage effectué
                                        </span>
                                        <span className="text-sm text-gray-500">
                                            Arrivée {formatTime(item.date_heure)}
                                        </span>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-primary-start shrink-0" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </NurseNavBar>
        </CustomDashboard>
    );
};
