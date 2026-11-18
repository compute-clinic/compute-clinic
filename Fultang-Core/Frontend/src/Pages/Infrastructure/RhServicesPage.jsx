import { useEffect, useState } from 'react';
import { Table, Tag } from 'antd';
import { CustomDashboard } from '../../GlobalComponents/CustomDashboard.jsx';
import { infrastructureRhNavLink } from './infrastructureNavLink.js';
import { getAllServices } from '../../services/servicesApi.js';
import { getAllPersonnel } from '../../services/personnelApi.js';

export function RhServicesPage() {
    const [services, setServices] = useState([]);
    const [personnel, setPersonnel] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const [s, p] = await Promise.all([getAllServices(), getAllPersonnel()]);
                const sl = s.results || s.data || s || [];
                const pl = p.results || p.data || p || [];
                setServices(Array.isArray(sl) ? sl : []);
                setPersonnel(Array.isArray(pl) ? pl : []);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const countFor = (serviceId) =>
        personnel.filter((p) => String(p.service) === String(serviceId)).length;

    const columns = [
        { title: 'Service', dataIndex: 'nom_service', render: (t) => <span className="font-semibold">{t}</span> },
        { title: 'Description', dataIndex: 'desc_service', ellipsis: true },
        {
            title: 'Effectif',
            key: 'eff',
            render: (_, r) => <Tag color="blue">{countFor(r.id ?? r.id_service)} agent(s)</Tag>,
        },
        { title: 'Code analytique', dataIndex: 'code_analytique' },
    ];

    return (
        <CustomDashboard linkList={infrastructureRhNavLink} requiredRole="rh">
            <div className="p-6 max-w-5xl mx-auto">
                <h1 className="text-2xl font-bold mb-4">Services de l&apos;établissement</h1>
                <Table
                    rowKey={(r) => String(r.id ?? r.id_service)}
                    loading={loading}
                    dataSource={services}
                    columns={columns}
                    pagination={false}
                />
            </div>
        </CustomDashboard>
    );
}

export default RhServicesPage;
