import { DirectorDashBoard } from "./Components/DirectorDashboard";
import { DirectorNavLink } from "./DirectorNavLink";
import { DirectorNavBar } from "./Components/DirectorNavBar";
import { useState } from "react";
import { AuditLogsContent } from "../Accountant/Audit/AuditLogs.jsx";
import { PatientAccessTraceContent } from "./PatientAccessTrace.jsx";

/**
 * Piste d'audit en lecture seule pour le Directeur
 * (comptabilité + traçabilité dossiers patients).
 */
export function DirectorAudit() {
    const [tab, setTab] = useState("patients");

    return (
        <DirectorDashBoard linkList={DirectorNavLink} requiredRole="directeur">
            <DirectorNavBar />
            <div className="p-6">
                <div className="flex gap-2 mb-6">
                    <button
                        type="button"
                        onClick={() => setTab("patients")}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                            tab === "patients"
                                ? "bg-primary-start text-white"
                                : "bg-white border border-slate-200 text-slate-700"
                        }`}
                    >
                        Dossiers patients
                    </button>
                    <button
                        type="button"
                        onClick={() => setTab("compta")}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                            tab === "compta"
                                ? "bg-primary-start text-white"
                                : "bg-white border border-slate-200 text-slate-700"
                        }`}
                    >
                        Comptabilité
                    </button>
                </div>
                {tab === "patients" ? <PatientAccessTraceContent /> : <AuditLogsContent />}
            </div>
        </DirectorDashBoard>
    );
}

export default DirectorAudit;
