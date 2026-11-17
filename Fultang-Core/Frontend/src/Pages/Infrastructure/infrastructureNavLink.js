import { FaHome } from 'react-icons/fa';
import { Users, Building2 } from 'lucide-react';
import { AppRoutesPaths } from '../../Router/appRouterPaths.js';

/** Navigation module Infrastructures & RH (établissement). */
export const infrastructureRhNavLink = [
    { name: 'Accueil RH', link: AppRoutesPaths.infrastructureRhHome, icon: FaHome },
    { name: 'Personnel', link: AppRoutesPaths.infrastructureRhPersonnel, icon: Users },
    { name: 'Services', link: AppRoutesPaths.infrastructureRhServices, icon: Building2 },
];
