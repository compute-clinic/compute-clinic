import React, { useEffect, useState } from 'react';
import { getPatientAccessLogs } from '../../services/patientTraceApi.js';
import { RefreshCw } from 'lucide-react';

export function PatientAccessTraceContent() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterCode, setFilterCode] = useState('');

    const load = async () => {
        try {
            setLoading(true);
            const params = filterCode.trim() ? { patient_code: filterCode.trim() } : {};
            const data = await getPatientAccessLogs(params);
            setLogs(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error(e);
            setLogs([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-xl font-bold text-slate-900">Traçabilité dossiers patients</h2>
                    <p className="text-sm text-slate-500 mt-1">
                        Qui a consulté ou modifié un dossier (fiche, dossier complet, examens, recherche).
                    </p>
                </div>
                <button
                    type="button"
                    onClick={load}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                    <RefreshCw className="w-4 h-4" /> Actualiser
                </button>
            </div>

            <div className="flex gap-2 mb-4">
                <input
                    type="text"
                    placeholder="Filtrer par code patient (ex. MB-CC-251002-001)"
                    value={filterCode}
                    onChange={(e) => setFilterCode(e.target.value)}
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
                <button
                    type="button"
                    onClick={load}
                    className="px-4 py-2 bg-primary-start text-white rounded-lg text-sm font-medium"
                >
                    Filtrer
                </button>
            </div>

            {loading ? (
                <p className="text-slate-500 text-sm py-8 text-center">Chargement…</p>
            ) : logs.length === 0 ? (
                <p className="text-slate-500 text-sm py-8 text-center">Aucune entrée pour le moment.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-slate-200 text-slate-500 uppercase text-xs">
                                <th className="py-3 pr-4">Date</th>
                                <th className="py-3 pr-4">Code</th>
                                <th className="py-3 pr-4">Patient</th>
                                <th className="py-3 pr-4">Action</th>
                                <th className="py-3 pr-4">Utilisateur</th>
                                <th className="py-3 pr-4">Rôle</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map((row) => (
                                <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50/80">
                                    <td className="py-3 pr-4 whitespace-nowrap">
                                        {row.created_at
                                            ? new Date(row.created_at).toLocaleString('fr-FR')
                                            : '—'}
                                    </td>
                                    <td className="py-3 pr-4 font-mono text-xs">{row.patient_code || '—'}</td>
                                    <td className="py-3 pr-4">{row.patient_nom || '—'}</td>
                                    <td className="py-3 pr-4">{row.action_label || row.action}</td>
                                    <td className="py-3 pr-4 font-mono text-xs">{row.user_id?.slice(0, 8) || '—'}…</td>
                                    <td className="py-3 pr-4 text-xs">{row.user_roles || '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
