import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Statistic, Row, Col } from 'antd';
import { Users, Building2, UserPlus } from 'lucide-react';
import { CustomDashboard } from '../../GlobalComponents/CustomDashboard.jsx';
import { infrastructureRhNavLink } from './infrastructureNavLink.js';
import { getAllPersonnel } from '../../services/personnelApi.js';
import { getAllServices } from '../../services/servicesApi.js';
import { AppRoutesPaths } from '../../Router/appRouterPaths.js';

export function RhHomePage() {
    const navigate = useNavigate();
    const [stats, setStats] = useState({ personnel: 0, services: 0 });

    useEffect(() => {
        Promise.allSettled([getAllPersonnel(), getAllServices()]).then(([p, s]) => {
            const plist = p.status === 'fulfilled'
                ? (p.value.results || p.value.data || p.value || [])
                : [];
            const slist = s.status === 'fulfilled'
                ? (s.value.results || s.value.data || s.value || [])
                : [];
            setStats({
                personnel: Array.isArray(plist) ? plist.length : 0,
                services: Array.isArray(slist) ? slist.length : 0,
            });
        });
    }, []);

    return (
        <CustomDashboard linkList={infrastructureRhNavLink} requiredRole="rh">
            <div className="p-6 bg-gray-50 min-h-screen max-w-5xl mx-auto">
                <h1 className="text-2xl font-bold text-gray-800 mb-2">Ressources humaines</h1>
                <p className="text-gray-500 mb-6 text-sm">
                    Recrutement, dossier de papiers de chaque agent et affectation aux services.
                </p>

                <Row gutter={16} className="mb-8">
                    <Col xs={24} sm={12}>
                        <Card hoverable onClick={() => navigate(AppRoutesPaths.infrastructureRhPersonnel)}>
                            <Statistic title="Personnel actif" value={stats.personnel} prefix={<Users />} />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12}>
                        <Card hoverable onClick={() => navigate(AppRoutesPaths.infrastructureRhServices)}>
                            <Statistic title="Services existants" value={stats.services} prefix={<Building2 />} />
                        </Card>
                    </Col>
                </Row>

                <button
                    type="button"
                    onClick={() => navigate(AppRoutesPaths.infrastructureRhPersonnel)}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-primary-start to-primary-end text-white font-semibold shadow-md"
                >
                    <UserPlus className="w-5 h-5" />
                    Gérer le personnel
                </button>
            </div>
        </CustomDashboard>
    );
}

export default RhHomePage;
