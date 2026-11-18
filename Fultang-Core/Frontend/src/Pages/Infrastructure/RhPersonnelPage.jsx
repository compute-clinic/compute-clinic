import { useState, useEffect } from 'react';
import { Table, Tag, Input, Select, message, Button } from 'antd';
import { UserPlus, Search, FileText } from 'lucide-react';
import { CustomDashboard } from '../../GlobalComponents/CustomDashboard.jsx';
import { infrastructureRhNavLink } from './infrastructureNavLink.js';
import { getAllPersonnel } from '../../services/personnelApi.js';
import { getAllServices } from '../../services/servicesApi.js';
import { AddPersonnelModal } from '../AdminViews/Personnel/AddPersonnelModal.jsx';
import { EditPersonnelModal } from '../AdminViews/Personnel/EditPersonnelModal.jsx';
import { PersonnelPapiersModal } from './PersonnelPapiersModal.jsx';
import { POSTES_RESERVES_RH, getServiceId } from '../../constants/personnelPostes.js';
import { getPersonnelPosteLabel } from '../../Utils/personnelUtils.js';

export function RhPersonnelPage() {
    const [personnel, setPersonnel] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterService, setFilterService] = useState('');
    const [addOpen, setAddOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [papiersOpen, setPapiersOpen] = useState(false);
    const [selected, setSelected] = useState(null);

    const load = async () => {
        setLoading(true);
        try {
            const [pRes, sRes] = await Promise.all([getAllPersonnel(), getAllServices()]);
            const plist = pRes.results || pRes.data || pRes || [];
            const slist = sRes.results || sRes.data || sRes || [];
            const list = (Array.isArray(plist) ? plist : []).filter(
                (p) => !POSTES_RESERVES_RH.includes(p.poste),
            );
            setPersonnel(list);
            setFiltered(list);
            setServices(Array.isArray(slist) ? slist : []);
        } catch (e) {
            message.error('Impossible de charger le personnel.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    useEffect(() => {
        let rows = [...personnel];
        if (search.trim()) {
            const q = search.toLowerCase();
            rows = rows.filter(
                (p) =>
                    (p.nom || '').toLowerCase().includes(q)
                    || (p.prenom || '').toLowerCase().includes(q)
                    || (p.email || '').toLowerCase().includes(q),
            );
        }
        if (filterService) {
            rows = rows.filter((p) => String(p.service) === String(filterService));
        }
        setFiltered(rows);
    }, [search, filterService, personnel]);

    const columns = [
        {
            title: 'Agent',
            key: 'name',
            render: (_, r) => (
                <div>
                    <p className="font-semibold">{r.nom} {r.prenom}</p>
                    <p className="text-xs text-gray-400">{r.email}</p>
                </div>
            ),
        },
        {
            title: 'Poste',
            dataIndex: 'poste',
            render: (p) => <Tag>{getPersonnelPosteLabel(p)}</Tag>,
        },
        {
            title: 'Service',
            dataIndex: 'service_nom',
            render: (v) => v || '—',
        },
        {
            title: 'Statut',
            dataIndex: 'statut',
            render: (s) => <Tag color={s === 'Actif' ? 'green' : 'default'}>{s}</Tag>,
        },
        {
            title: '',
            key: 'act',
            render: (_, r) => (
                <div className="flex flex-wrap gap-2">
                    <Button
                        size="small"
                        icon={<FileText className="w-3.5 h-3.5" />}
                        onClick={() => { setSelected(r); setPapiersOpen(true); }}
                    >
                        Papiers{typeof r.nb_papiers === 'number' ? ` (${r.nb_papiers})` : ''}
                    </Button>
                    <Button size="small" onClick={() => { setSelected(r); setEditOpen(true); }}>
                        Modifier / affecter
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <CustomDashboard linkList={infrastructureRhNavLink} requiredRole="rh">
            <div className="p-6 max-w-6xl mx-auto">
                <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Personnel</h1>
                        <p className="text-sm text-gray-500">Recrutement, dossier (papiers) et affectation aux services</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setAddOpen(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-start text-white text-sm font-semibold"
                    >
                        <UserPlus className="w-4 h-4" />
                        Nouveau personnel
                    </button>
                </div>

                <div className="flex flex-wrap gap-3 mb-4">
                    <Input
                        prefix={<Search className="w-4 h-4 text-gray-400" />}
                        placeholder="Rechercher…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="max-w-xs"
                    />
                    <Select
                        allowClear
                        placeholder="Service"
                        style={{ minWidth: 200 }}
                        value={filterService || undefined}
                        onChange={(v) => setFilterService(v || '')}
                        options={services.map((s) => ({
                            value: String(getServiceId(s)),
                            label: s.nom_service || s.nom,
                        }))}
                    />
                </div>

                <Table rowKey="id" loading={loading} dataSource={filtered} columns={columns} pagination={{ pageSize: 12 }} />

                <AddPersonnelModal
                    isOpen={addOpen}
                    onClose={() => setAddOpen(false)}
                    onSuccess={() => { setAddOpen(false); load(); }}
                    excludePostes={POSTES_RESERVES_RH}
                    enablePapiers
                />
                {selected && (
                    <EditPersonnelModal
                        isOpen={editOpen}
                        onClose={() => { setEditOpen(false); setSelected(null); }}
                        personnel={selected}
                        onSuccess={() => { setEditOpen(false); load(); }}
                    />
                )}
                {selected && (
                    <PersonnelPapiersModal
                        open={papiersOpen}
                        personnel={selected}
                        onClose={() => { setPapiersOpen(false); setSelected(null); }}
                        onChanged={load}
                    />
                )}
            </div>
        </CustomDashboard>
    );
}

export default RhPersonnelPage;
