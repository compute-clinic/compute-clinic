import { useEffect, useState } from 'react';
import { Table, Tag, message, Alert } from 'antd';
import { CustomDashboard } from '../../GlobalComponents/CustomDashboard.jsx';
import { AppHeader } from '../../GlobalComponents/AppHeader.jsx';
import { platformAdminNavLink } from './platformAdminNavLink.js';
import {
    getDemandesService,
    approuverDemandePlateforme,
    rejeterDemandeService,
    STATUT_DEMANDE_LABELS,
} from '../../services/demandeServiceApi.js';

export function PlatformAdminServiceDemandes() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = async () => {
        setLoading(true);
        try {
            const data = await getDemandesService({ statut: 'ENVOYEE_PLATEFORME' });
            setRows(Array.isArray(data) ? data : []);
        } catch {
            message.error('Impossible de charger les demandes (vérifiez le rôle plateforme et la Gateway).');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const columns = [
        { title: 'Établissement (tenant)', dataIndex: 'tenant_id', ellipsis: true },
        { title: 'Service', dataIndex: 'nom_service_propose' },
        { title: 'Description', dataIndex: 'desc_service', ellipsis: true },
        {
            title: 'Statut',
            dataIndex: 'statut',
            render: (s) => <Tag>{STATUT_DEMANDE_LABELS[s] || s}</Tag>,
        },
        {
            title: 'Décision',
            key: 'dec',
            render: (_, r) => (
                <div className="flex gap-2">
                    <button
                        type="button"
                        className="text-green-700 font-semibold text-sm"
                        onClick={async () => {
                            try {
                                await approuverDemandePlateforme(r.id_demande);
                                message.success('Service créé — notification envoyée à l\'admin local.');
                                load();
                            } catch (e) {
                                message.error(e.response?.data?.detail || 'Échec approbation.');
                            }
                        }}
                    >
                        Créer le service
                    </button>
                    <button
                        type="button"
                        className="text-red-600 text-sm"
                        onClick={async () => {
                            const motif = window.prompt('Motif du rejet') || '';
                            await rejeterDemandeService(r.id_demande, motif);
                            load();
                        }}
                    >
                        Rejeter
                    </button>
                </div>
            ),
        },
    ];

    return (
        <CustomDashboard linkList={platformAdminNavLink} requiredRole="platform_admin" brandLabel="FullTang Platform">
            <AppHeader subtitle="CompuClinic" title="Demandes de services hospitaliers" />
            <div className="p-6">
                <Alert
                    className="mb-4"
                    type="warning"
                    showIcon
                    message="Seul le gestionnaire plateforme peut matérialiser un service dans l'établissement concerné."
                />
                <Table rowKey="id_demande" loading={loading} dataSource={rows} columns={columns} pagination={{ pageSize: 10 }} />
            </div>
        </CustomDashboard>
    );
}

export default PlatformAdminServiceDemandes;
