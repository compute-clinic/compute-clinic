import { LayoutGrid, ClipboardList, UserRound, Calendar, FlaskConical, Bed } from 'lucide-react';
import { AppRoutesPaths } from "../../Router/appRouterPaths.js";

export const nurseNavLink = [
    {
        name: "Salle d'attente",
        link: AppRoutesPaths.nurseWaitingRoomPage,
        icon: LayoutGrid,
    },
    {
        name: "Mes consultations",
        link: AppRoutesPaths.nurseMyConsultationsPage,
        icon: ClipboardList,
    },
    {
        name: "Gestion Patients",
        link: AppRoutesPaths.nursePatientManagementPage,
        icon: UserRound,
    },
    {
        name: "Rendez-vous",
        link: AppRoutesPaths.nurseAppointmentsPage,
        icon: Calendar,
    },
    {
        name: "Examens",
        link: "/nurse/exams",
        icon: FlaskConical,
    },
    {
        name: "Hospitalisations",
        link: "/nurse/hospitalizations",
        icon: Bed,
    },
];