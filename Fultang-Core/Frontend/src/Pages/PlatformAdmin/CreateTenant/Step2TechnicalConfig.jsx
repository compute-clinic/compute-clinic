import PropTypes from "prop-types";
import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, MousePointer } from "lucide-react";

/**
 * Étape 2 de l'assistant de création : configuration technique.
 *
 * Ne contient pour cette phase qu'un seul réglage — le partage des données
 * cliniques — sous forme de VRAIE case à cocher (et non un select ou une
 * paire de boutons oui/non), cochée par défaut pour refléter la valeur par
 * défaut backend (`allow_clinical_agent_export: true`).
 */
export function Step2TechnicalConfig({ allowClinicalAgentExport, policyAccepted, onChange, onPolicyAcceptedChange, onNext, onBack }) {
    const [policyAttention, setPolicyAttention] = useState(false);
    const policyRef = useRef(null);
    const handleNext = () => {
        if (allowClinicalAgentExport && !policyAccepted) {
            setPolicyAttention(true);
            policyRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
            return;
        }
        onNext();
    };
    const handlePolicyChange = (checked) => { onPolicyAcceptedChange(checked); if (checked) setPolicyAttention(false); };
    return (
        <div className="flex flex-col gap-6">
            <div>
                <h3 className="text-lg font-bold text-gray-800">Configuration technique</h3>
                <p className="text-sm text-gray-500 mt-1">
                    Paramètres techniques de fonctionnement de l&apos;établissement.
                </p>
            </div>

            <div className="rounded-lg border border-gray-200 p-4 bg-gray-50">
                <div className="space-y-4">
                    <div>
                        <h4 className="text-sm font-bold text-gray-800">Partage des données cliniques</h4>
                        <p className="text-xs leading-5 text-gray-600 mt-2">Le partage est volontaire et concerne uniquement les données anonymisées prévues pour les outils d’aide à la décision clinique de la plateforme. Il ne donne pas un accès général aux données de l’établissement. Lorsqu’elles sont conservées par le système, les informations gardent leur provenance établissement ; l’accès reste limité au fonctionnement prévu par la plateforme.</p>
                    </div>
                    <label className="flex items-start gap-3 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={allowClinicalAgentExport}
                        onChange={(e) => onChange(e.target.checked)}
                        className="mt-0.5 w-5 h-5 rounded border-gray-300 text-primary-end focus:ring-primary-end accent-primary-end cursor-pointer flex-shrink-0"
                    />
                    <span>
                        <span className="block text-sm font-bold text-gray-800">
                            Activer le partage des données cliniques
                        </span>
                        <span className="block text-xs text-gray-500 mt-1">
                            Cette option reste inactive tant que la politique ci-dessous n’est pas acceptée.
                        </span>
                    </span>
                    </label>
                    <label ref={policyRef} className={`ml-8 flex items-start gap-2.5 border-l-2 pl-3 pt-1 cursor-pointer transition-colors ${policyAttention ? "border-amber-400 bg-amber-50/70 rounded-r pr-3 py-2" : "border-gray-200"}`}>
                        <input type="checkbox" checked={policyAccepted} onChange={(e) => handlePolicyChange(e.target.checked)} className="mt-0.5 h-3.5 w-3.5 rounded border-gray-300 text-primary-end focus:ring-primary-end accent-primary-end" />
                        <span><span className="block text-xs font-semibold text-gray-700">Acceptation explicite de la politique</span><span className="block text-xs leading-5 text-gray-500 mt-0.5">Requise uniquement si vous activez le partage.</span></span>
                    </label>
                    {policyAttention && <div className="ml-8 flex items-center gap-1.5 text-xs font-medium text-amber-700"><MousePointer className="w-4 h-4" />Veuillez accepter la politique pour activer le partage.</div>}
                </div>
            </div>

            <div className="flex justify-between pt-2">
                <button
                    type="button"
                    onClick={onBack}
                    className="inline-flex items-center gap-2 text-gray-600 font-bold px-5 py-2.5 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Précédent
                </button>
                <button
                    type="button"
                    onClick={handleNext}
                    className="inline-flex items-center gap-2 text-white font-bold px-6 py-2.5 rounded-lg bg-gradient-to-r from-primary-start to-primary-end transition-opacity"
                >
                    Suivant
                    <ArrowRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}

Step2TechnicalConfig.propTypes = {
    allowClinicalAgentExport: PropTypes.bool.isRequired,
    policyAccepted: PropTypes.bool.isRequired,
    onChange: PropTypes.func.isRequired,
    onPolicyAcceptedChange: PropTypes.func.isRequired,
    onNext: PropTypes.func.isRequired,
    onBack: PropTypes.func.isRequired,
};

export default Step2TechnicalConfig;
