import { XIcon, Stethoscope, CheckCircle, AlertTriangle } from 'lucide-react';
import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Alert } from 'antd';
import axiosInstance from '../../Utils/axiosInstance.js';
import { getGatewayBaseUrl } from '../../Utils/gatewayUrls.js';
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

    const handleSubmit = async (envoyerCaisse) => {
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

            let serviceId = null;
            let serviceNom = '';
            if (medecinId) {
                try {
                    const gw = getGatewayBaseUrl();
                    const docRes = await axiosInstance.get(`${gw}/personnel/medecins/${medecinId}/`);
                    const doc = docRes.data;
                    serviceId = doc?.service ?? doc?.service_id ?? null;
                    serviceNom = doc?.service_nom || '';
                } catch {
                    try {
                        const gw = getGatewayBaseUrl();
                        const docRes = await axiosInstance.get(`${gw}/personnel/medecins-generalistes/${medecinId}/`);
                        const doc = docRes.data;
                        serviceId = doc?.service ?? doc?.service_id ?? null;
                        serviceNom = doc?.service_nom || '';
                    } catch {
                        /* visite sans service explicite */
                    }
                }
            }

            await convertRdvToVisite({
                patientId: rdv.patient,
                rdvId: rdv.id,
                motif: formData.motif.trim(),
                medecinOrienteId: medecinId,
                modeUrgence: formData.mode_urgence,
                paiementRequis: envoyerCaisse,
                serviceId,
                serviceNom,
            });

            const name = patient
                ? `${patient.nom} ${patient.prenom || ''}`.trim()
                : (patientLabel || 'le patient');
            const baseMsg = `Visite ouverte pour ${name} (RDV converti).`;
            setSuccessMessage(
                formData.mode_urgence
                    ? `${baseMsg}\n\nMode urgences : orientez le patient vers l'infirmier (paiement différé).`
                    : envoyerCaisse
                        ? `${baseMsg}\n\nCaisse : triage infirmier d'abord, puis médecin après paramètres et règlement.`
                        : `${baseMsg}\n\nLe patient apparaît chez l'infirmier du service, puis chez le médecin après les paramètres.`
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

                <div className="p-8 space-y-6">
                    {error && <Alert message={error} type="error" showIcon className="rounded-xl" />}
                    <Alert
                        type="info"
                        showIcon
                        className="rounded-xl"
                        message="Parcours : infirmier (paramètres) puis médecin. La caisse ne bloque que l'étape médecin."
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={() => handleSubmit(true)}
                            className="flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white py-3.5 rounded-xl font-bold disabled:opacity-50"
                        >
                            {isSubmitting ? 'Conversion…' : 'Envoyer à la caisse'}
                        </button>
                        <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={() => handleSubmit(false)}
                            className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-xl font-bold disabled:opacity-50"
                        >
                            <CheckCircle className="w-5 h-5" />
                            {isSubmitting ? 'Conversion…' : 'Passer'}
                        </button>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-xl"
                    >
                        Annuler
                    </button>
                </div>
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
