import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Card,
    Col,
    Row,
    Statistic,
    Table,
    Select,
    Tabs,
    Tag,
    Alert,
    Spin,
    Button,
} from 'antd';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
} from 'recharts';
import {
    Users,
    Building2,
    BedDouble,
    Wallet,
    Package,
    Activity,
    RefreshCw,
    ClipboardList,
    UserCheck,
    UserX,
    FilePlus2,
    FileText,
    History,
    ArrowRight,
} from 'lucide-react';
import { DirectorDashBoard } from './Components/DirectorDashboard';
import { DirectorNavLink } from './DirectorNavLink';
import { DirectorNavBar } from './Components/DirectorNavBar';
import { fetchDirectorOverviewData } from '../../services/directorApi.js';
import { AppRoutesPaths } from '../../Router/appRouterPaths.js';

const { Option } = Select;

const MOIS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

/* Couleurs du camembert « Répartition du personnel par poste » (ex-vue administrateur). */
const POSTE_COLORS = ['#1A73A3', '#50C2B9', '#051161', '#F59E0B', '#EF4444', '#8B5CF6', '#10B981', '#EC4899', '#6366F1', '#14B8A6'];

/* Accès rapides de gestion : regroupe les anciens accès « Administrateur » et les écrans directeur. */
const QUICK_ACTIONS = [
    {
        title: 'Services',
        desc: 'Consultation des services et statistiques',
        icon: Building2,
        link: AppRoutesPaths.adminServicesPage,
        gradient: 'from-blue-500 to-cyan-500',
    },
    {
        title: 'Infrastructures',
        desc: 'Salles, bâtiments et étages',
        icon: BedDouble,
        link: AppRoutesPaths.adminChambresPage,
        gradient: 'from-purple-500 to-indigo-500',
    },
    {
        title: 'Demandes de service',
        desc: 'Signature des demandes à transmettre à CompuClinic',
        icon: FilePlus2,
        link: AppRoutesPaths.directorServiceRequests,
        gradient: 'from-emerald-500 to-teal-500',
    },
    {
        title: 'Validations achats',
        desc: 'Approbation des besoins et bons de commande',
        icon: ClipboardList,
        link: AppRoutesPaths.directorApprovals,
        gradient: 'from-amber-500 to-orange-500',
    },
    {
        title: 'Rapports',
        desc: 'Rapports reçus des services',
        icon: FileText,
        link: AppRoutesPaths.directorReports,
        gradient: 'from-sky-500 to-blue-600',
    },
    {
        title: 'Piste d\'audit',
        desc: 'Traçabilité des actions dans le SI',
        icon: History,
        link: AppRoutesPaths.directorAudit,
        gradient: 'from-slate-500 to-gray-700',
    },
];

const PRESENCE_TAGS = {
    actif_si: { color: 'green', label: 'Actif dans le SI aujourd\'hui' },
    sans_trace: { color: 'orange', label: 'Aucune action tracée aujourd\'hui' },
    absent_prevu: { color: 'default', label: 'Congé / suspendu / autre' },
};

function formatFcfa(val) {
    return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Number(val) || 0) + ' FCFA';
}

export function DirectorOverview() {
    const currentYear = new Date().getFullYear();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [selectedYears, setSelectedYears] = useState([currentYear - 1, currentYear]);
    const [financeYearChart, setFinanceYearChart] = useState(currentYear);
    const [serviceFilter, setServiceFilter] = useState('all');
    const [selectedStaffId, setSelectedStaffId] = useState(null);

    const yearOptions = useMemo(
        () => Array.from({ length: 6 }, (_, i) => currentYear - i),
        [currentYear],
    );

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const overview = await fetchDirectorOverviewData(selectedYears);
            setData(overview);
            if (!selectedYears.includes(financeYearChart)) {
                setFinanceYearChart(selectedYears[selectedYears.length - 1] || currentYear);
            }
        } catch (e) {
            console.error(e);
            setData(null);
        } finally {
            setLoading(false);
        }
    }, [selectedYears, currentYear]);

    useEffect(() => {
        load();
    }, [load]);

    const financeChartData = useMemo(() => {
        const mois = data?.finance?.evolutionByYear?.[financeYearChart] || [];
        return mois.map((m) => ({
            name: MOIS[(m.mois || 1) - 1],
            Recettes: m.recettes ?? 0,
            Dépenses: m.depenses_comptabilisees ?? m.depenses ?? 0,
            Résultat: m.resultat_comptable ?? m.resultat ?? 0,
        }));
    }, [data, financeYearChart]);

    const financeYearTotals = useMemo(() => {
        const years = data?.finance?.years || selectedYears;
        return years.map((year) => {
            const mois = data?.finance?.evolutionByYear?.[year] || [];
            const recettes = mois.reduce((s, m) => s + (m.recettes ?? 0), 0);
            const depenses = mois.reduce(
                (s, m) => s + (m.depenses_comptabilisees ?? m.depenses ?? 0),
                0,
            );
            const resultat = mois.reduce(
                (s, m) => s + (m.resultat_comptable ?? m.resultat ?? 0),
                0,
            );
            return { year, recettes, depenses, resultat };
        });
    }, [data, selectedYears]);

    const personnelFiltered = useMemo(() => {
        const list = data?.personnel || [];
        if (serviceFilter === 'all') return list;
        return list.filter((p) => String(p.service) === String(serviceFilter));
    }, [data, serviceFilter]);

    const selectedWorkload = useMemo(() => {
        if (!selectedStaffId) return null;
        return (data?.workloads || []).find((w) => w.id === selectedStaffId) || null;
    }, [data, selectedStaffId]);

    const kpis = data?.finance?.kpis;

    const personnelColumns = [
        {
            title: 'Nom',
            key: 'nom',
            render: (_, r) => (
                <span className="font-semibold">{r.nom} {r.prenom}</span>
            ),
        },
        { title: 'Poste', dataIndex: 'poste', render: (p) => <Tag>{p}</Tag> },
        { title: 'Service', dataIndex: 'service_nom', render: (v) => v || '—' },
        { title: 'Statut', dataIndex: 'statut', render: (s) => <Tag color={s === 'Actif' ? 'blue' : 'default'}>{s || '—'}</Tag> },
        { title: 'Matricule', dataIndex: 'matricule' },
    ];

    const presenceColumns = [
        {
            title: 'Personnel',
            key: 'p',
            render: (_, r) => `${r.nom} ${r.prenom}`,
        },
        { title: 'Poste', dataIndex: 'posteLabel' },
        { title: 'Service', dataIndex: 'serviceNom' },
        { title: 'Statut RH', dataIndex: 'statut' },
        {
            title: 'Actions SI (jour)',
            dataIndex: 'actionsToday',
            align: 'center',
        },
        {
            title: 'Présence numérique',
            dataIndex: 'presence',
            render: (p) => {
                const cfg = PRESENCE_TAGS[p] || PRESENCE_TAGS.sans_trace;
                return <Tag color={cfg.color}>{cfg.label}</Tag>;
            },
        },
    ];

    const rapportColumns = [
        {
            title: 'Date',
            dataIndex: 'date_creation',
            render: (_, r) => {
                const d = r.date_envoi || r.date_creation;
                return d ? new Date(d).toLocaleDateString('fr-FR') : '—';
            },
        },
        { title: 'Objet', dataIndex: 'objet', ellipsis: true },
        { title: 'Statut', dataIndex: 'statut', render: (s) => <Tag>{s || '—'}</Tag> },
        {
            title: 'Contenu',
            dataIndex: 'corps',
            ellipsis: true,
            render: (c) => (c ? String(c).slice(0, 80) : '—'),
        },
    ];

    if (loading && !data) {
        return (
            <DirectorDashBoard linkList={DirectorNavLink} requiredRole="directeur">
                <DirectorNavBar />
                <div className="flex justify-center items-center h-96">
                    <Spin size="large" tip="Chargement du tableau de bord…" />
                </div>
            </DirectorDashBoard>
        );
    }

    return (
        <DirectorDashBoard linkList={DirectorNavLink} requiredRole="directeur">
            <DirectorNavBar />
            <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
                <div className="flex flex-wrap justify-between items-start gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Vue d&apos;ensemble de l&apos;hôpital</h1>
                        <p className="text-gray-500 mt-1">
                            Personnel, services, infrastructures, finances, stocks, présence et fiches de travail.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2 items-center">
                        <span className="text-xs font-bold text-gray-400 uppercase">Années financières</span>
                        <Select
                            mode="multiple"
                            style={{ minWidth: 200 }}
                            value={selectedYears}
                            onChange={setSelectedYears}
                            placeholder="Années"
                        >
                            {yearOptions.map((y) => (
                                <Option key={y} value={y}>{y}</Option>
                            ))}
                        </Select>
                        <Button icon={<RefreshCw className="w-4 h-4" />} onClick={load} loading={loading}>
                            Actualiser
                        </Button>
                        <Link
                            to={AppRoutesPaths.directorApprovals}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-start text-white text-sm font-semibold hover:opacity-90"
                        >
                            <ClipboardList className="w-4 h-4" />
                            Validations achats
                        </Link>
                    </div>
                </div>

                {data?.errors?.length > 0 && (
                    <Alert
                        type="warning"
                        showIcon
                        message="Certaines sources n'ont pas répondu (compta, medical ou matière). Les indicateurs affichés sont partiels."
                    />
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                    <Card>
                        <Statistic
                            title="Personnel"
                            value={data?.hospital?.personnelTotal ?? 0}
                            prefix={<Users className="w-5 h-5 text-primary-start" />}
                        />
                    </Card>
                    <Card>
                        <Statistic
                            title="Services"
                            value={data?.hospital?.servicesTotal ?? 0}
                            prefix={<Building2 className="w-5 h-5 text-primary-start" />}
                        />
                    </Card>
                    <Card>
                        <Statistic
                            title="Salles / chambres"
                            value={data?.hospital?.chambresTotal ?? 0}
                            prefix={<BedDouble className="w-5 h-5 text-purple-600" />}
                        />
                        <p className="text-xs text-gray-400 mt-1 m-0">
                            Occupation : {data?.infrastructure?.tauxOccupation ?? 0}% —{' '}
                            {data?.infrastructure?.placesDisponibles ?? 0} place(s) libre(s)
                        </p>
                    </Card>
                    <Card>
                        <Statistic
                            title="Patients (dossiers)"
                            value={data?.hospital?.patientsEnregistres ?? '—'}
                            prefix={<Activity className="w-5 h-5 text-primary-start" />}
                        />
                    </Card>
                    <Card>
                        <Statistic
                            title="Visites en cours"
                            value={data?.hospital?.visitesEnCours ?? '—'}
                            prefix={<Activity className="w-5 h-5 text-orange-500" />}
                        />
                    </Card>
                </div>

                <Row gutter={[16, 16]}>
                    <Col xs={24} lg={8}>
                        <Card title="Trésorerie & budget (exercice)" className="h-full">
                            {kpis ? (
                                <div className="space-y-3 text-sm">
                                    <p><span className="text-gray-500">Trésorerie :</span>{' '}
                                        <strong>{formatFcfa(kpis.tresorerie?.solde ?? kpis.solde_tresorerie)}</strong>
                                    </p>
                                    <p><span className="text-gray-500">Budget disponible :</span>{' '}
                                        <strong>{formatFcfa(kpis.budget?.disponible ?? kpis.budget_disponible)}</strong>
                                    </p>
                                    <p><span className="text-gray-500">Recettes (période) :</span>{' '}
                                        <strong>{formatFcfa(kpis.kpis?.total_recettes ?? kpis.total_recettes)}</strong>
                                    </p>
                                    <p><span className="text-gray-500">Dépenses (période) :</span>{' '}
                                        <strong>{formatFcfa(kpis.kpis?.total_depenses ?? kpis.total_depenses)}</strong>
                                    </p>
                                </div>
                            ) : (
                                <p className="text-gray-400 text-sm">Indicateurs comptables indisponibles.</p>
                            )}
                        </Card>
                    </Col>
                    <Col xs={24} lg={8}>
                        <Card title="Stocks & approvisionnements" className="h-full">
                            <Row gutter={8}>
                                <Col span={12}>
                                    <Statistic title="Articles médicaux" value={data?.stocks?.articlesMedicaux ?? 0} prefix={<Package />} />
                                </Col>
                                <Col span={12}>
                                    <Statistic title="Alertes stock" value={data?.stocks?.alertesStock ?? 0} valueStyle={{ color: '#dc2626' }} />
                                </Col>
                            </Row>
                            <p className="text-xs text-gray-500 mt-4">
                                Besoins matière en cours : <strong>{data?.stocks?.besoinsEnCours ?? 0}</strong>
                            </p>
                        </Card>
                    </Col>
                    <Col xs={24} lg={8}>
                        <Card title="Présence du jour (trace SI)" className="h-full">
                            <div className="flex gap-4 flex-wrap">
                                <Statistic
                                    title="Actifs tracés"
                                    value={data?.presence?.actifsToday ?? 0}
                                    prefix={<UserCheck className="text-green-600" />}
                                />
                                <Statistic
                                    title="Sans trace"
                                    value={data?.presence?.sansTrace ?? 0}
                                    prefix={<UserX className="text-orange-500" />}
                                />
                            </div>
                            <p className="text-xs text-gray-400 mt-3">
                                Basé sur le statut RH et les actions enregistrées dans la piste d&apos;audit (connexions et opérations).
                            </p>
                        </Card>
                    </Col>
                </Row>

                <Card
                    title={
                        <span className="flex items-center gap-2">
                            <Wallet className="w-5 h-5" />
                            Évolution financière annuelle
                        </span>
                    }
                    extra={(
                        <Select value={financeYearChart} onChange={setFinanceYearChart} style={{ width: 120 }}>
                            {(data?.finance?.years || selectedYears).map((y) => (
                                <Option key={y} value={y}>{y}</Option>
                            ))}
                        </Select>
                    )}
                >
                    {financeYearTotals.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                            {financeYearTotals.map((row) => (
                                <div
                                    key={row.year}
                                    className={`rounded-xl border p-3 text-sm ${row.year === financeYearChart ? 'border-primary-start bg-primary-start/5' : 'border-gray-100'}`}
                                >
                                    <p className="font-bold text-gray-800">{row.year}</p>
                                    <p className="text-gray-500">Recettes : {formatFcfa(row.recettes)}</p>
                                    <p className="text-gray-500">Résultat : {formatFcfa(row.resultat)}</p>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="h-72">
                        {financeChartData.length ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={financeChartData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                                    <Tooltip formatter={(v) => formatFcfa(v)} />
                                    <Legend />
                                    <Area type="monotone" dataKey="Recettes" stackId="1" stroke="#059669" fill="#6ee7b7" />
                                    <Area type="monotone" dataKey="Dépenses" stackId="2" stroke="#dc2626" fill="#fca5a5" />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <p className="text-center text-gray-400 py-16">Aucune donnée pour cette année.</p>
                        )}
                    </div>
                </Card>

                <Row gutter={[16, 16]}>
                    <Col xs={24} lg={12}>
                        <Card title="Effectifs par service" className="h-full">
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={data?.personnelByService || []}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="nom" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={70} />
                                        <YAxis allowDecimals={false} />
                                        <Tooltip />
                                        <Bar dataKey="count" fill="#6366f1" name="Personnel" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>
                    </Col>
                    <Col xs={24} lg={12}>
                        <Card title="Répartition du personnel par poste" className="h-full">
                            <div className="h-64">
                                {(data?.personnelByPoste || []).length ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={data.personnelByPoste}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={55}
                                                outerRadius={90}
                                                paddingAngle={3}
                                                dataKey="value"
                                                nameKey="name"
                                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                                labelLine={false}
                                            >
                                                {data.personnelByPoste.map((entry, index) => (
                                                    <Cell key={entry.poste} fill={POSTE_COLORS[index % POSTE_COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(v) => [`${v} agent(s)`, 'Effectif']} />
                                            <Legend iconType="circle" />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <p className="text-center text-gray-400 py-16">Aucune donnée de personnel.</p>
                                )}
                            </div>
                        </Card>
                    </Col>
                </Row>

                <Row gutter={[16, 16]}>
                    <Col xs={24} lg={12}>
                        <Card title="Accès rapides" className="h-full">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {QUICK_ACTIONS.map((action) => (
                                    <Link
                                        key={action.title}
                                        to={action.link}
                                        className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-primary-end/40 hover:shadow-md transition-all group"
                                    >
                                        <div className={`p-2.5 rounded-lg bg-gradient-to-br ${action.gradient} shadow-sm`}>
                                            <action.icon className="w-5 h-5 text-white" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-gray-800 m-0 group-hover:text-primary-end transition-colors">
                                                {action.title}
                                            </p>
                                            <p className="text-xs text-gray-500 m-0 truncate">{action.desc}</p>
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-primary-end transition-colors" />
                                    </Link>
                                ))}
                            </div>
                        </Card>
                    </Col>
                    <Col xs={24} lg={12}>
                        <Card title="Liste des services" className="h-full">
                            <Table
                                size="small"
                                pagination={false}
                                rowKey={(r) => String(r.id ?? r.id_service)}
                                dataSource={data?.services || []}
                                columns={[
                                    { title: 'Service', dataIndex: 'nom_service', render: (v, r) => v || r.nom },
                                    {
                                        title: 'Effectif',
                                        key: 'eff',
                                        render: (_, r) => {
                                            const id = String(r.id ?? r.id_service);
                                            const row = (data?.personnelByService || []).find((x) => x.id === id);
                                            return row?.count ?? 0;
                                        },
                                    },
                                    { title: 'Description', dataIndex: 'desc_service', ellipsis: true },
                                ]}
                            />
                        </Card>
                    </Col>
                </Row>

                <Tabs
                    defaultActiveKey="personnel"
                    items={[
                        {
                            key: 'personnel',
                            label: 'Personnel',
                            children: (
                                <>
                                    <div className="mb-4 flex gap-2 items-center">
                                        <span className="text-sm text-gray-500">Filtrer par service</span>
                                        <Select
                                            value={serviceFilter}
                                            onChange={setServiceFilter}
                                            style={{ minWidth: 220 }}
                                        >
                                            <Option value="all">Tous les services</Option>
                                            {(data?.services || []).map((s) => {
                                                const id = s.id ?? s.id_service;
                                                return (
                                                    <Option key={id} value={String(id)}>
                                                        {s.nom_service || s.nom}
                                                    </Option>
                                                );
                                            })}
                                        </Select>
                                    </div>
                                    <Table
                                        rowKey="id"
                                        dataSource={personnelFiltered}
                                        columns={personnelColumns}
                                        pagination={{ pageSize: 10 }}
                                        size="middle"
                                    />
                                </>
                            ),
                        },
                        {
                            key: 'presence',
                            label: 'Présence & assiduité',
                            children: (
                                <Table
                                    rowKey="id"
                                    dataSource={data?.presence?.rows || []}
                                    columns={presenceColumns}
                                    pagination={{ pageSize: 12 }}
                                />
                            ),
                        },
                        {
                            key: 'fiches',
                            label: 'Fiches de travail (rapports)',
                            children: (
                                <Table
                                    rowKey={(r) => r.id || r.id_rapport}
                                    dataSource={data?.rapports || []}
                                    columns={rapportColumns}
                                    pagination={{ pageSize: 8 }}
                                />
                            ),
                        },
                        {
                            key: 'suivi',
                            label: 'Suivi individuel',
                            children: (
                                <div className="space-y-4">
                                    <Select
                                        showSearch
                                        placeholder="Choisir un membre du personnel"
                                        style={{ width: '100%', maxWidth: 420 }}
                                        optionFilterProp="label"
                                        onChange={setSelectedStaffId}
                                        options={(data?.workloads || []).map((w) => ({
                                            value: w.id,
                                            label: `${w.posteLabel} — ${w.nom} ${w.prenom}`,
                                        }))}
                                    />
                                    {selectedWorkload ? (
                                        <Card size="small" title={`${selectedWorkload.nom} ${selectedWorkload.prenom}`}>
                                            <p><strong>Service :</strong> {selectedWorkload.serviceNom}</p>
                                            <p><strong>Actions tracées (audit) :</strong> {selectedWorkload.auditActions}</p>
                                            <p><strong>Dernière action :</strong> {selectedWorkload.lastAction}</p>
                                            <p><strong>Modules touchés :</strong>{' '}
                                                {selectedWorkload.auditModules.length
                                                    ? selectedWorkload.auditModules.join(', ')
                                                    : '—'}
                                            </p>
                                            <p><strong>Rapports / fiches émis :</strong> {selectedWorkload.rapportsCount}</p>
                                            <p><strong>Besoins matière émis :</strong> {selectedWorkload.besoinsEmis}</p>
                                        </Card>
                                    ) : (
                                        <p className="text-gray-400 text-sm">Sélectionnez un agent pour voir son activité agrégée.</p>
                                    )}
                                </div>
                            ),
                        },
                        {
                            key: 'stocks',
                            label: 'Détail stocks',
                            children: (
                                <Table
                                    size="small"
                                    rowKey={(r) => r.id || r.idMateriel}
                                    dataSource={data?.stocks?.lowStockMed || []}
                                    columns={[
                                        { title: 'Article', dataIndex: 'nom_materiel', render: (v, r) => v || r.nom },
                                        { title: 'Stock', dataIndex: 'quantite_stock' },
                                        { title: 'Seuil', dataIndex: 'seuil_alerte' },
                                    ]}
                                    pagination={false}
                                />
                            ),
                        },
                    ]}
                />
            </div>
        </DirectorDashBoard>
    );
}

export default DirectorOverview;
