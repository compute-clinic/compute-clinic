import { useEffect, useState } from 'react';
import { Modal, Select, message, Spin, Empty, Tag, Button, Input } from 'antd';
import { FileText, Upload, Download, Trash2 } from 'lucide-react';
import {
    TYPES_PAPIERS_RH,
    getPersonnelPapiers,
    uploadPersonnelPapier,
    downloadPersonnelPapier,
    deletePersonnelPapier,
} from '../../services/personnelApi.js';

export function PersonnelPapiersModal({ open, personnel, onClose, onChanged }) {
    const [docs, setDocs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [typeDoc, setTypeDoc] = useState('CNI');
    const [libelle, setLibelle] = useState('');
    const [fichier, setFichier] = useState(null);

    const personnelId = personnel?.id || personnel?.id_personnel;

    const load = async () => {
        if (!personnelId) return;
        setLoading(true);
        try {
            const data = await getPersonnelPapiers(personnelId);
            setDocs(Array.isArray(data) ? data : []);
        } catch {
            message.error('Impossible de charger le dossier.');
            setDocs([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open && personnelId) load();
    }, [open, personnelId]);

    const handleUpload = async () => {
        if (!fichier) {
            message.warning('Choisissez un fichier.');
            return;
        }
        setUploading(true);
        try {
            await uploadPersonnelPapier(personnelId, {
                fichier,
                type_document: typeDoc,
                libelle,
            });
            message.success('Pièce ajoutée au dossier.');
            setFichier(null);
            setLibelle('');
            await load();
            onChanged?.();
        } catch (e) {
            const detail = e.response?.data?.fichier?.[0] || e.response?.data?.detail;
            message.error(detail || "Échec de l'enregistrement.");
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (doc) => {
        try {
            await deletePersonnelPapier(personnelId, doc.id);
            message.success('Pièce retirée.');
            await load();
            onChanged?.();
        } catch {
            message.error('Suppression impossible.');
        }
    };

    const nom = personnel ? `${personnel.nom || ''} ${personnel.prenom || ''}`.trim() : '';

    return (
        <Modal
            title={(
                <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary-end" />
                    <span>Dossier — {nom || 'agent'}</span>
                </div>
            )}
            open={open}
            onCancel={onClose}
            footer={null}
            width={640}
        >
            <p className="text-sm text-gray-500 mb-4">
                Papiers relatifs à cet agent : pièce d&apos;identité, CV, diplômes, contrat…
            </p>

            <div className="rounded-lg border border-gray-200 p-3 mb-4 space-y-3 bg-gray-50">
                <div className="grid grid-cols-2 gap-2">
                    <Select
                        value={typeDoc}
                        onChange={setTypeDoc}
                        options={TYPES_PAPIERS_RH}
                    />
                    <Input
                        placeholder="Libellé (facultatif)"
                        value={libelle}
                        onChange={(e) => setLibelle(e.target.value)}
                    />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        onChange={(e) => setFichier(e.target.files?.[0] || null)}
                    />
                    <Button type="primary" icon={<Upload className="w-4 h-4" />} loading={uploading} onClick={handleUpload}>
                        Ajouter au dossier
                    </Button>
                </div>
                <p className="text-xs text-gray-400">PDF, image ou Word — 10 Mo maximum.</p>
            </div>

            {loading ? (
                <div className="py-8 flex justify-center"><Spin /></div>
            ) : docs.length === 0 ? (
                <Empty description="Aucune pièce pour le moment" />
            ) : (
                <ul className="space-y-2 max-h-72 overflow-y-auto">
                    {docs.map((d) => (
                        <li key={d.id} className="flex items-center justify-between gap-2 p-2 bg-white border rounded-lg">
                            <div>
                                <Tag>{d.type_document_libelle || d.type_document}</Tag>
                                <p className="text-sm font-medium mt-1">{d.libelle || d.nom_fichier}</p>
                                <p className="text-xs text-gray-400">
                                    {d.date_depot ? new Date(d.date_depot).toLocaleDateString('fr-FR') : ''}
                                </p>
                            </div>
                            <div className="flex gap-1">
                                <Button
                                    size="small"
                                    icon={<Download className="w-4 h-4" />}
                                    onClick={() => downloadPersonnelPapier(personnelId, d.id, d.nom_fichier)}
                                />
                                <Button
                                    size="small"
                                    danger
                                    icon={<Trash2 className="w-4 h-4" />}
                                    onClick={() => handleDelete(d)}
                                />
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </Modal>
    );
}

export default PersonnelPapiersModal;
