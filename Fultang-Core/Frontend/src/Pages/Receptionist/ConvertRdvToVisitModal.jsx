import { XIcon, Stethoscope, CheckCircle, AlertTriangle } from 'lucide-react';
import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Alert } from 'antd';
import axiosInstance from '../../Utils/axiosInstance.js';
import { convertRdvToVisite } from '../../services/visiteApi.js';

export function ConvertRdvToVisitModal({
    isOpen,
    onClose,
    rdv,
    patientLabel,
    setSuccessMessage,
    setCanOpenSuccessModal,
    onConverted,
}) {
    const [formData, setFormData] = useState({
        motif: '',
        mode_urgence: false,
    });
    const [patient, setPatient] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!isOpen || !rdv) {
            setFormData({ motif: '', mode_urgence: false });
            setPatient(null);
            setError('');
            return;
        }

        setFormData({
            motif: rdv.motif || rdv.raison || '',
            mode_urgence: false,
        });

        const loadPatient = async () => {
            try {
                const response = await axiosInstance.get(`/patients/${rdv.patient}/`);
                setPatient(response.data);
            } catch {
                setPatient({ id: rdv.patient, nom: patientLabel || 'Patient', prenom: '' });
            }
        };
        loadPatient();
    }, [isOpen, rdv, patientLabel]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!rdv?.patient) return;
        if (!formData.motif?.trim()) {
            setError('Le motif de la visite est obligatoire.');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            const medecinId = rdv.personnel_concerne &&
                /^[0-9a-f-]{36}$/i.test(String(rdv.personnel_concerne))
                ? rdv.personnel_concerne
                : null;

            await convertRdvToVisite({
                patientId: rdv.patient,
                rdvId: rdv.id,
                motif: formData.motif.trim(),
                medecinOrienteId: medecinId,
                modeUrgence: formData.mode_urgence,
            });

            const name = patient
                ? `${patient.nom} ${patient.prenom || ''}`.trim()
                : (patientLabel || 'le patient');
            const baseMsg = `Visite ouverte pour ${name} (RDV converti).`;
            setSuccessMessage(
                formData.mode_urgence
                    ? `${baseMsg}\n\nMode urgences : orientez le patient vers l'infirmier (paiement différé).`
                    : `${baseMsg}\n\nProchaine étape : le patient doit se présenter à la caisse pour régler la consultation.`
            );
            setCanOpenSuccessModal(true);
            onConverted?.();
            onClose();
        } catch (err) {
            const detail = err.response?.data;
            const msg = typeof detail === 'object'
                ? Object.entries(detail).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' — ')
                : null;
            setError(msg || 'Impossible de convertir le rendez-vous en visite.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen || !rdv) return null;

    const displayName = patient
        ? `${patient.nom} ${patient.prenom || ''}`.trim()
        : (patientLabel || 'Patient');

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
                <div className="bg-gradient-to-r from-emerald-600 to-teal-500 p-6 flex justify-between items-center text-white">
                    <div>
                        <h3 className="text-xl font-bold">Accueillir le patient (RDV)</h3>
                        <p className="text-emerald-100 text-xs">Patient : {displayName}</p>
                    </div>
                    <button type="button" onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    {error && <Alert message={error} type="error" showIcon className="rounded-xl" />}
                    <Alert
                        type="info"
                        showIcon
                        className="rounded-xl"
                        message={
                            formData.mode_urgence
                                ? 'Mode urgences : prise en charge possible avant paiement.'
                                : 'Après ouverture de la visite, orientez le patient vers la caisse avant l\'infirmier et le médecin.'
                        }
                    />

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                            <Stethoscope className="w-4 h-4 text-emerald-600" />
                            Motif de la visite <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            value={formData.motif}
                            onChange={(e) => setFormData({ ...formData, motif: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none min-h-[100px]"
                            required
                        />
                    </div>

                    <label className="flex items-start gap-3 p-4 rounded-xl border border-orange-200 bg-orange-50 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={formData.mode_urgence}
                            onChange={(e) => setFormData({ ...formData, mode_urgence: e.target.checked })}
                            className="mt-1"
                        />
                        <span>
                            <span className="font-semibold text-orange-800 block">Admission urgences</span>
                            <span className="text-xs text-orange-700">Bypass paiement initial (CORR-A3-001)</span>
                        </span>
                    </label>

                    <div className="flex gap-4 pt-4">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 bg-emerald-600 text-white py-3.5 rounded-xl font-bold shadow-lg hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            <CheckCircle className="w-5 h-5" />
                            {isSubmitting ? 'Conversion…' : 'Ouvrir la visite'}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-3.5 text-gray-500 font-bold hover:bg-gray-100 rounded-xl transition-all"
                        >
                            Annuler
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

ConvertRdvToVisitModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    rdv: PropTypes.object,
    patientLabel: PropTypes.string,
    setSuccessMessage: PropTypes.func.isRequired,
    setCanOpenSuccessModal: PropTypes.func.isRequired,
    onConverted: PropTypes.func,
};
