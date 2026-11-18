import { FaHome, FaFileAlt, FaHistory, FaClipboardCheck, FaPenFancy, FaHospital, FaBed } from "react-icons/fa";
import { AppRoutesPaths } from "../../Router/appRouterPaths.js";

/**
 * Navigation du directeur : pilotage global (tableau de bord), gestion de
 * l'établissement (services, infrastructures — anciennement vue « Administrateur »)
 * et actes de direction (validations, demandes de service, rapports, audit).
 */
export const DirectorNavLink = [
    {
        name: "Tableau de bord",
        link: AppRoutesPaths.directorDashboard,
        icon: FaHome
    },
    {
        name: "Services",
        link: AppRoutesPaths.adminServicesPage,
        icon: FaHospital
    },
    {
        name: "Infrastructures",
        link: AppRoutesPaths.adminChambresPage,
        icon: FaBed
    },
    {
        name: "Validations achats",
        link: AppRoutesPaths.directorApprovals,
        icon: FaClipboardCheck
    },
    {
        name: "Demandes de service",
        link: AppRoutesPaths.directorServiceRequests,
        icon: FaPenFancy
    },
    {
        name: "Rapports",
        link: AppRoutesPaths.directorReports,
        icon: FaFileAlt
    },
    {
        name: "Piste d'Audit",
        link: AppRoutesPaths.directorAudit,
        icon: FaHistory
    }
];
