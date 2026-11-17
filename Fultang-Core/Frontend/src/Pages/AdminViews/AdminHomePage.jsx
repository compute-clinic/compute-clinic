import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Building2, BedDouble, ArrowRight, FilePlus2, UserCog, Activity, ShieldCheck } from 'lucide-react';
import { AddPersonnelModal } from './Personnel/AddPersonnelModal.jsx';
import { CustomDashboard } from '../../GlobalComponents/CustomDashboard.jsx';
import { AdminNavBar } from './AdminNavBar.jsx';
import { newAdminNavLink } from './newAdminNavLink.js';
import { getAllServices } from '../../services/servicesApi';
import { getAllChambres } from '../../services/chambresApi';
import { AppRoutesPaths } from '../../Router/appRouterPaths.js';

/**
 * Tableau de bord de l'administrateur système (admin local / informaticien, CORR-A5-010).
 * Périmètre technique uniquement : demandes de service, infrastructures, compte RH.
 * Le pilotage global (personnel, services, finances, stocks, présence) est dans la vue Directeur.
 */
export function AdminHomePage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [stats, setStats] = useState({ services: 0, chambres: 0 });
    const [loading, setLoading] = useState(true);
    const [rhModalOpen, setRhModalOpen] = useState(false);

    useEffect(() => {
        fetchAllStats();
    }, []);

    const fetchAllStats = async () => {
        setLoading(true);
        try {
            const [servicesRes, chambresRes] = await Promise.allSettled([
                getAllServices(),
                getAllChambres(),
            ]);

            const servicesData = servicesRes.status === 'fulfilled'
                ? (servicesRes.value.results || servicesRes.value.data || servicesRes.value || [])
                : [];
            const chambresData = chambresRes.status === 'fulfilled'
                ? (chambresRes.value.results || chambresRes.value.data || chambresRes.value || [])
                : [];

            const sArr = Array.isArray(servicesData) ? servicesData : [];
            const cArr = Array.isArray(chambresData) ? chambresData : [];

            setStats({
                services: sArr.length,
                chambres: cArr.length,
            });
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const statCards = [
        {
            title: t('admin.servicesAvailable'),
            value: stats.services,
            icon: Building2,
            color: 'from-blue-500 to-blue-600',
            bgLight: 'bg-blue-50',
            textColor: 'text-blue-600',
            link: AppRoutesPaths.adminServicesPage
        },
        {
            title: t('admin.roomsAvailable'),
            value: stats.chambres,
            icon: BedDouble,
            color: 'from-purple-500 to-indigo-600',
            bgLight: 'bg-purple-50',
            textColor: 'text-purple-600',
            link: AppRoutesPaths.adminChambresPage
        }
    ];

    const quickActions = [
        {
            title: 'Demander un service',
            desc: 'Workflow directeur → CompuClinic',
            icon: FilePlus2,
            link: AppRoutesPaths.adminServiceRequestsPage,
            gradient: 'from-blue-500 to-cyan-500'
        },
        {
            title: t('admin.manageRooms', { defaultValue: 'Infrastructures' }),
            desc: 'Salles, bâtiments et étages',
            icon: BedDouble,
            link: AppRoutesPaths.adminChambresPage,
            gradient: 'from-purple-500 to-indigo-500'
        }
    ];

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
    };

    return (
        <CustomDashboard linkList={newAdminNavLink} requiredRole={"Admin"}>
            <AdminNavBar />
            <div className="p-6 bg-gray-50 min-h-screen">
                {/* Welcome Banner */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="mb-8 bg-gradient-to-r from-primary-start to-primary-end rounded-2xl p-8 text-white shadow-lg"
                >
                    <div className="flex items-center gap-3 mb-2">
                        <ShieldCheck className="w-8 h-8" />
                        <h1 className="text-3xl font-bold">{t('admin.welcomeDashboard')}</h1>
                    </div>
                    <p className="text-white/80 text-lg ml-11">{t('admin.manageEfficiently')}</p>
                </motion.div>

                {/* Stat Cards */}
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8"
                >
                    {statCards.map((card, index) => (
                        <motion.div
                            key={index}
                            variants={itemVariants}
                            whileHover={{ scale: 1.03, y: -4 }}
                            onClick={() => navigate(card.link)}
                            className="bg-white rounded-xl shadow-md p-6 cursor-pointer border border-gray-100 hover:shadow-xl transition-shadow"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500 font-medium">{card.title}</p>
                                    <p className="text-4xl font-bold text-gray-800 mt-2">
                                        {loading ? (
                                            <span className="inline-block w-12 h-8 bg-gray-200 rounded animate-pulse"></span>
                                        ) : card.value}
                                    </p>
                                </div>
                                <div className={`p-4 rounded-2xl bg-gradient-to-br ${card.color} shadow-lg`}>
                                    <card.icon className="w-7 h-7 text-white" />
                                </div>
                            </div>
                            <div className="mt-4 flex items-center text-sm text-gray-400 hover:text-primary-end transition-colors">
                                <span>Voir les détails</span>
                                <ArrowRight className="w-4 h-4 ml-1" />
                            </div>
                        </motion.div>
                    ))}
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                        className="bg-white rounded-xl shadow-md p-6 border border-gray-100"
                    >
                        <div className="flex items-center gap-2 mb-4">
                            <UserCog className="w-5 h-5 text-primary-end" />
                            <h2 className="text-lg font-semibold text-gray-800">Compte responsable RH</h2>
                        </div>
                        <p className="text-sm text-gray-500 mb-4">
                            Le recrutement et l&apos;affectation du personnel sont gérés par le module RH (Infrastructures).
                            Créez ici le compte RH initial si nécessaire.
                        </p>
                        <button
                            type="button"
                            onClick={() => setRhModalOpen(true)}
                            className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold"
                        >
                            Créer un compte RH
                        </button>
                    </motion.div>

                    {/* Quick Actions */}
                    <motion.div
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                        className="bg-white rounded-xl shadow-md p-6 border border-gray-100"
                    >
                        <div className="flex items-center gap-2 mb-6">
                            <Activity className="w-5 h-5 text-primary-end" />
                            <h2 className="text-lg font-semibold text-gray-800">{t('admin.quickAccess')}</h2>
                        </div>
                        <div className="space-y-4">
                            {quickActions.map((action, index) => (
                                <motion.div
                                    key={index}
                                    whileHover={{ x: 6 }}
                                    onClick={() => navigate(action.link)}
                                    className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:border-primary-end/30 hover:shadow-md cursor-pointer transition-all group"
                                >
                                    <div className={`p-3 rounded-xl bg-gradient-to-br ${action.gradient} shadow-md`}>
                                        <action.icon className="w-6 h-6 text-white" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-gray-800 group-hover:text-primary-end transition-colors">
                                            {action.title}
                                        </h3>
                                        <p className="text-sm text-gray-500">{action.desc}</p>
                                    </div>
                                    <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-primary-end transition-colors" />
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </div>
            <AddPersonnelModal
                isOpen={rhModalOpen}
                onClose={() => setRhModalOpen(false)}
                onSuccess={() => setRhModalOpen(false)}
                includeOnlyPostes={['rh']}
            />
        </CustomDashboard>
    );
}

export default AdminHomePage;
