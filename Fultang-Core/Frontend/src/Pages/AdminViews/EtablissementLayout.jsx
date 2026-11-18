import PropTypes from 'prop-types';
import { CustomDashboard } from '../../GlobalComponents/CustomDashboard.jsx';
import { AdminNavBar } from './AdminNavBar.jsx';
import { newAdminNavLink } from './newAdminNavLink.js';
import { DirectorDashBoard } from '../Director/Components/DirectorDashboard.jsx';
import { DirectorNavBar } from '../Director/Components/DirectorNavBar.jsx';
import { DirectorNavLink } from '../Director/DirectorNavLink.js';
import { useAuthentication } from '../../Utils/Provider.jsx';

/**
 * Layout partagé des écrans de gestion de l'établissement (services, infrastructures).
 *
 * Ces écrans font partie de la vue du directeur (pilotage) et restent accessibles
 * à l'administrateur système (paramétrage technique). Le layout, la navigation et
 * l'en-tête sont choisis d'après le rôle de l'utilisateur connecté, sans dupliquer
 * les pages.
 */
export function EtablissementLayout({ children }) {
    const { hasRole } = useAuthentication();

    if (hasRole('directeur')) {
        return (
            <DirectorDashBoard linkList={DirectorNavLink} requiredRole="directeur">
                <DirectorNavBar />
                {children}
            </DirectorDashBoard>
        );
    }

    return (
        <CustomDashboard linkList={newAdminNavLink} requiredRole="Admin">
            <AdminNavBar />
            {children}
        </CustomDashboard>
    );
}

EtablissementLayout.propTypes = {
    children: PropTypes.node.isRequired,
};

export default EtablissementLayout;
