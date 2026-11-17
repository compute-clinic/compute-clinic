import { XIcon, Stethoscope, Clock, AlertTriangle, Wallet, ArrowRightCircle, CheckCircle } from "lucide-react";
import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { Alert, Select } from "antd";
import axios from "axios";
import axiosInstance from "../../Utils/axiosInstance.js";
import { PERSONNEL_MEDECINS_URL, PERSONNEL_MEDECINS_GENERALISTES_URL } from "../../Utils/gatewayUrls.js";
import { getToken } from "../../Utils/authToken.js";

export function CreateVisitModal({ isOpen, onClose, patient, setSuccessMessage, setCanOpenSuccessModal }) {
    CreateVisitModal.propTypes = {
        isOpen: PropTypes.bool.isRequired,
        onClose: PropTypes.func.isRequired,
        patient: PropTypes.object,
        setSuccessMessage: PropTypes.func.isRequired,
        setCanOpenSuccessModal: PropTypes.func.isRequired,
    };

    const [formData, setFormData] = useState({
        motif: '',
        id_medecin: '',
        mode_urgence: false,
    });
    const [doctors, setDoctors] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [doctorsError, setDoctorsError] = useState("");

    useEffect(() => {
        if (!isOpen) {
            setFormData({ motif: '', id_medecin: '', mode_urgence: false });
            setError("");
            return;
        }

        const fetchDoctors = async () => {
            setDoctorsError("");
            try {
                const token = getToken();
                const headers = token ? { Authorization: `Bearer ${token}` } : {};
                const [r1, r2] = await Promise.allSettled([
                    axios.get(PERSONNEL_MEDECINS_URL(), { headers }),
                    axios.get(PERSONNEL_MEDECINS_GENERALISTES_URL(), { headers }),
                ]);
                const listOf = (res) => {
                    if (res.status !== 'fulfilled') return [];
                    const d = res.value.data;
                    return Array.isArray(d) ? d : (d?.results || []);
                };
                const mapped = [...listOf(r1), ...listOf(r2)];
                setDoctors(mapped);
                if (mapped.length === 0) {
                    setDoctorsError(
                        "Aucun médecin trouvé dans le service personnel. Vous pouvez quand même créer la visite."
                    );
                }
            } catch (err) {
                console.error("Erreur chargement médecins:", err);
                setDoctors([]);
                setDoctorsError(
                    "Liste des médecins indisponible (vérifiez que le service personnel est démarré). "
                    + "Vous pouvez créer la visite sans sélectionner de médecin."
                );
            }
        };
        fetchDoctors();
    }, [isOpen]);

    const selectedDoctor = doctors.find(
        (d) => String(d.id_personnel || d.id) === String(formData.id_medecin)
    );

    const handleSubmit = async (envoyerCaisse) => {
        if (!formData.motif?.trim()) {
            setError("Le motif de la visite est obligatoire.");
            return;
        }
        if (!formData.id_medecin) {
            setError("Sélectionnez un médecin pour orienter le patient vers le bon service (infirmier puis médecin).");
            return;
        }

        setIsSubmitting(true);
        setError("");

        try {
            const payload = {
                patient: patient.id,
                motif_visite: formData.motif.trim(),
                mode_urgence: formData.mode_urgence,
                paiement_requis: envoyerCaisse,
            };
            if (formData.id_medecin) {
                payload.medecin_oriente_id = formData.id_medecin;
            }
            const serviceId = selectedDoctor?.service || selectedDoctor?.service_id;
            const serviceNom = selectedDoctor?.service_nom;
            if (serviceId) payload.service_id = serviceId;
            if (serviceNom) payload.service_nom = serviceNom;

            const response = await axiosInstance.post("/visites/", payload);

            if (response.status === 201 || response.status === 200) {
                const medecinNote = selectedDoctor
                    ? ` — orienté Dr. ${selectedDoctor.nom}`
                    : "";
                const baseMsg = `Visite créée avec succès pour ${patient.nom}${medecinNote} !`;
                setSuccessMessage(
                    formData.mode_urgence
                        ? `${baseMsg}\n\nMode urgences : orientez le patient vers l'infirmier (paiement différé).`
                        : envoyerCaisse
                            ? `${baseMsg}\n\nEnvoi caisse : le patient apparaît d'abord chez l'infirmier du service pour les paramètres ; le médecin le verra après le triage et le règlement.`
                            : `${baseMsg}\n\nLe patient apparaît d'abord chez l'infirmier du service ; après prise des paramètres, il sera visible chez le médecin orienté.`
                );
                setCanOpenSuccessModal(true);
                onClose();
            }
        } catch (err) {
            const detail = err.response?.data;
            const msg = typeof detail === 'object'
                ? Object.entries(detail).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' — ')
                : null;
            setError(msg || "Impossible de créer la visite. Vérifiez que le service medical est démarré.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen || !patient) return null;

    const doctorOptions = doctors.map((d) => ({
        value: String(d.id_personnel || d.id),
        label: `Dr. ${d.nom || ''} ${d.prenom || ''}${d.service_nom ? ` — ${d.service_nom}` : ''}`.trim(),
    }));

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
                <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-6 flex justify-between items-center text-white">
                    <div>
                        <h3 className="text-xl font-bold">Ouvrir un dossier de visite</h3>
                        <p className="text-blue-100 text-xs">
                            Patient : {patient.nom} {patient.prenom}
                        </p>
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
                        message="Parcours : réception → infirmier (paramètres) → médecin du service. Le paiement à la caisse bloque seulement l'accès médecin, pas le triage infirmier."
                    />
                    {doctorsError && (
                        <Alert
                            message={doctorsError}
                            type="warning"
                            showIcon
                            icon={<AlertTriangle className="w-4 h-4" />}
                            className="rounded-xl"
                        />
                    )}

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                            <Stethoscope className="w-4 h-4 text-blue-500" />
                            Motif de la visite <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            value={formData.motif}
                            onChange={(e) => setFormData({ ...formData, motif: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none min-h-[100px] transition-all"
                            placeholder="Ex: Fièvre persistante, Consultation de routine..."
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-blue-500" />
                            Médecin / service
                            <span className="text-gray-400 font-normal text-xs">(oriente le dossier, pas de fuite entre services)</span>
                        </label>
                        <Select
                            className="w-full"
                            placeholder={
                                doctors.length
                                    ? "Sélectionner un médecin"
                                    : "Aucun médecin chargé — visite possible sans"
                            }
                            value={formData.id_medecin || undefined}
                            allowClear
                            onChange={(val) => setFormData({ ...formData, id_medecin: val || '' })}
                            options={doctorOptions}
                            size="large"
                            notFoundContent="Aucun médecin — confirmez quand même la visite"
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
                            <span className="font-semibold text-orange-800 block">Admission urgences / dossier provisoire</span>
                            <span className="text-xs text-orange-700">Prise en charge immédiate même si envoyé à la caisse</span>
                        </span>
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={() => handleSubmit(true)}
                            className="flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white py-3.5 rounded-xl font-bold shadow-lg transition-all disabled:opacity-50"
                        >
                            <Wallet className="w-5 h-5" />
                            {isSubmitting ? "Création…" : "Envoyer à la caisse"}
                        </button>
                        <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={() => handleSubmit(false)}
                            className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-xl font-bold shadow-lg transition-all disabled:opacity-50"
                        >
                            <ArrowRightCircle className="w-5 h-5" />
                            {isSubmitting ? "Création…" : "Passer (sans caisse)"}
                        </button>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                        <CheckCircle className="w-4 h-4 opacity-0" />
                        Annuler
                    </button>
                </div>
            </div>
        </div>
    );
}
