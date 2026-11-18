import { useEffect, useState } from 'react';
import { Table, Tag, Modal, Input, message, Alert } from 'antd';
import { CustomDashboard } from '../../GlobalComponents/CustomDashboard.jsx';
import { AdminNavBar } from './AdminNavBar.jsx';
import { newAdminNavLink } from './newAdminNavLink.js';
import {
    createDemandeService,
    getDemandesService,
    envoyerDemandePlateforme,
    STATUT_DEMANDE_LABELS,
} from '../../services/demandeServiceApi.js';
import { useAuthentication } from '../../Utils/Provider.jsx';

export function AdminServiceRequestsPage() {
    const { userData } = useAuthentication();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [form, setForm] = useState({
        nom_service_propose: '',
        desc_service: '',
        code_analytique_propose: '',
        commentaire_admin: '',
    });

    const load = async () => {
        setLoading(true);
        try {
            const data = await getDemandesService();
            setRows(Array.isArray(data) ? data : []);
        } catch {
            message.error('Impossible de charger les demandes.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const submit = async () => {
        if (!form.nom_service_propose.trim()) {
            message.warning('Indiquez le nom du service demandé.');
            return;
        }
        try {
            await createDemandeService({
                ...form,
                demandeur_email: userData?.email,
            });
            message.success('Demande enregistrée — en attente de signature du directeur.');
            setModalOpen(false);
            setForm({ nom_service_propose: '', desc_service: '', code_analytique_propose: '', commentaire_admin: '' });
            load();
        } catch (e) {
            message.error(e.response?.data?.detail || 'Échec de la demande.');
        }
    };

    const columns = [
        { title: 'Service demandé', dataIndex: 'nom_service_propose' },
        {
            title: 'Statut',
            dataIndex: 'statut',
            render: (s) => <Tag>{STATUT_DEMANDE_LABELS[s] || s}</Tag>,
        },
        { title: 'Créée le', dataIndex: 'date_creation', render: (d) => (d ? new Date(d).toLocaleString('fr-FR') : '—') },
        {
            title: 'Action',
            key: 'act',
            render: (_, r) =>
                r.statut === 'SIGNEE_DIRECTEUR' ? (
                    <button
                        type="button"
                        className="text-primary-start font-semibold text-sm"
                        onClick={async () => {
                            await envoyerDemandePlateforme(r.id_demande);
                            message.success('Envoyée à CompuClinic.');
                            load();
                        }}
                    >
                        Envoyer à CompuClinic
                    </button>
                ) : null,
        },
    ];

    return (
        <CustomDashboard linkList={newAdminNavLink} requiredRole="Admin">
            <AdminNavBar />
            <div className="p-6 max-w-5xl mx-auto">
                <h1 className="text-2xl font-bold mb-2">Demandes de service</h1>
                <Alert
                    className="mb-4"
                    showIcon
                    type="info"
                    message="En tant qu'administrateur local (informaticien), vous préparez la demande. Le directeur signe ; CompuClinic crée le service."
                />
                <button
                    type="button"
                    onClick={() => setModalOpen(true)}
                    className="mb-4 px-4 py-2 rounded-lg bg-primary-start text-white font-semibold text-sm"
                >
                    Nouvelle demande
                </button>
                <Table rowKey="id_demande" loading={loading} dataSource={rows} columns={columns} pagination={{ pageSize: 8 }} />

                <Modal
                    title="Demander l'ouverture d'un service"
                    open={modalOpen}
                    onCancel={() => setModalOpen(false)}
                    onOk={submit}
                    okText="Soumettre au directeur"
                >
                    <div className="space-y-3 py-2">
                        <Input
                            placeholder="Nom du service *"
                            value={form.nom_service_propose}
                            onChange={(e) => setForm({ ...form, nom_service_propose: e.target.value })}
                        />
                        <Input.TextArea
                            placeholder="Description / justification"
                            rows={3}
                            value={form.desc_service}
                            onChange={(e) => setForm({ ...form, desc_service: e.target.value })}
                        />
                        <Input
                            placeholder="Code analytique proposé (optionnel)"
                            value={form.code_analytique_propose}
                            onChange={(e) => setForm({ ...form, code_analytique_propose: e.target.value })}
                        />
                        <Input.TextArea
                            placeholder="Note pour le directeur"
                            rows={2}
                            value={form.commentaire_admin}
                            onChange={(e) => setForm({ ...form, commentaire_admin: e.target.value })}
                        />
                    </div>
                </Modal>
            </div>
        </CustomDashboard>
    );
}

export default AdminServiceRequestsPage;
