import { AlertCircle, X } from 'lucide-react';
import PropTypes from "prop-types";
import { useState } from "react";

/**
 * `confirmText`/`cancelText` sont optionnels (défaut : "Confirm"/"Cancel",
 * comportement inchangé pour tout appelant existant) — ajoutés pour la
 * double confirmation du Cycle de vie du tenant (Phase 3), qui impose des
 * libellés de bouton précis ("Oui, suspendre l'établissement", etc.) plutôt
 * que le texte générique.
 *
 * `requireTypedConfirmation` (optionnel, Phase 4 — suppression définitive
 * de tenant, étendu ensuite à la suspension et à la désactivation de
 * service) : quand renseigné (la valeur exacte attendue — nom du tenant,
 * code du service...), le bouton de confirmation reste désactivé tant que
 * la saisie ne correspond pas exactement — aucun appelant existant ne
 * passe cette prop, comportement par défaut inchangé.
 *
 * Copier/coller/couper/glisser-déposer sont bloqués sur ce champ (§6 de la
 * mission "double confirmation renforcée") : la valeur doit être saisie
 * manuellement, jamais collée depuis le libellé affiché juste au-dessus.
 * Protection frontend UNIQUEMENT — la validation réelle reste côté
 * backend (voir chaque appelant : `confirmation_value` envoyé à l'API,
 * jamais une confiance dans ce seul contrôle client).
 */
export function ConfirmationModal ({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirm", cancelText = "Cancel", requireTypedConfirmation = null }) {


    ConfirmationModal.propTypes = {
        isOpen: PropTypes.bool.isRequired,
        onClose: PropTypes.func.isRequired,
        onConfirm: PropTypes.func.isRequired,
        title: PropTypes.string.isRequired,
        message: PropTypes.node.isRequired,
        confirmText: PropTypes.string,
        cancelText: PropTypes.string,
        requireTypedConfirmation: PropTypes.string,
    }

    const [typedValue, setTypedValue] = useState("");

    if (!isOpen) return null;

    const isConfirmDisabled = requireTypedConfirmation !== null && typedValue !== requireTypedConfirmation;

    const handleClose = () => {
        setTypedValue("");
        onClose();
    };

    // Bloque copier/couper/coller/glisser-déposer sur le champ de
    // confirmation critique — l'utilisateur doit taper la valeur
    // lui-même. Ne remplace jamais la validation backend (voir docstring).
    const blockClipboardAndDrop = (e) => e.preventDefault();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm transition-all duration-300">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm mx-4 animate-fade-in-up">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                        <AlertCircle className="w-12 h-12 text-yellow-500 mr-2" />
                        <h3 className="text-2xl font-bold mt-1 text-gray-900">{title}</h3>
                    </div>
                </div>
                <div className="text-gray-700 mb-6 font-semibold">{message}</div>
                {requireTypedConfirmation !== null && (
                    <div className="mb-6">
                        <label className="block text-sm text-gray-600 mb-1">
                            Tapez <span className="font-mono font-bold">{requireTypedConfirmation}</span> pour confirmer :
                        </label>
                        <input
                            type="text"
                            value={typedValue}
                            onChange={(e) => setTypedValue(e.target.value)}
                            onPaste={blockClipboardAndDrop}
                            onCopy={blockClipboardAndDrop}
                            onCut={blockClipboardAndDrop}
                            onDrop={blockClipboardAndDrop}
                            onContextMenu={blockClipboardAndDrop}
                            autoComplete="off"
                            autoCorrect="off"
                            spellCheck="false"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                            autoFocus
                        />
                    </div>
                )}
                <div className="flex justify-end space-x-3">
                    <button
                        disabled={isConfirmDisabled}
                        onClick={() => {
                            if (isConfirmDisabled) return;
                            setTypedValue("");
                            onConfirm();
                            onClose();
                        }}
                        className="px-4 py-2 bg-primary-end text-white rounded-lg text-md hover:text-xl font-bold transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-md"
                    >
                        {confirmText}
                    </button>
                    <button
                        onClick={handleClose}
                        className="px-4 py-2 bg-red-400 text-white  rounded-lg font-bold hover:bg-red-500 transition-all duration-300"
                    >
                        {cancelText}
                    </button>
                </div>
            </div>
        </div>
    );
}

