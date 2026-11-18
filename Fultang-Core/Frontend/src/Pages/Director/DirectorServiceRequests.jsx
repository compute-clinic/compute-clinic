import { useEffect, useState } from 'react';
import { Table, Tag, message } from 'antd';
import { DirectorDashBoard } from './Components/DirectorDashboard';
import { DirectorNavLink } from './DirectorNavLink';
import { DirectorNavBar } from './Components/DirectorNavBar';
import {
    getDemandesService,
    signerDemandeDirecteur,
    rejeterDemandeService,
    STATUT_DEMANDE_LABELS,
} from '../../services/demandeServiceApi.js';

export function DirectorServiceRequests() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = async () => {
        setLoading(true);
        try {
            const all = await getDemandesService();
            setRows(Array.isArray(all) ? all : []);
        } catch {
            message.error('Impossible de charger les demandes.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const columns = [
        { title: 'Service', dataIndex: 'nom_service_propose' },
        { title: 'Description', dataIndex: 'desc_service', ellipsis: true },
        {
            title: 'Statut',
            dataIndex: 'statut',
            render: (s) => <Tag>{STATUT_DEMANDE_LABELS[s] || s}</Tag>,
        },
        {
            title: 'Signature',
            key: 'sig',
            render: (_, r) =>
                r.statut === 'SOUMISE' ? (
                    <div className="flex gap-2">
                        <button
                            type="button"
                            className="text-green-700 font-semibold text-sm"
                            onClick={async () => {
                                await signerDemandeDirecteur(r.id_demande, 'Validé par le directeur');
                                message.success('Demande signée.');
                                load();
                            }}
                        >
                            Signer
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
                ) : (
                    '—'
                ),
        },
    ];

    return (
        <DirectorDashBoard linkList={DirectorNavLink} requiredRole="directeur">
            <DirectorNavBar />
            <div className="p-6 max-w-5xl mx-auto">
                <h1 className="text-2xl font-bold mb-4">Signature des demandes de service</h1>
                <p className="text-sm text-gray-500 mb-4">
                    Après votre signature, l&apos;administrateur local transmet la demande à CompuClinic.
                </p>
                <Table rowKey="id_demande" loading={loading} dataSource={rows} columns={columns} pagination={{ pageSize: 10 }} />
            </div>
        </DirectorDashBoard>
    );
}

export default DirectorServiceRequests;
