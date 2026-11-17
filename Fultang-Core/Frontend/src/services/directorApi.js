import axiosInstance from '../Utils/axiosInstance.js';
import { getAllPersonnel } from './personnelApi.js';
import { getAllServices } from './servicesApi.js';
import { getAllChambres } from './chambresApi.js';
import { getTableauDeBordData, getEvolutionMensuelle, getAuditLogs } from './accountantApi.js';
import {
    materielMedicalApi,
    materielDurableApi,
    besoinApi,
    rapportApi,
    sortieApi,
} from './comptabiliteMatiereApi.js';
import { getPersonnelUuid, getPersonnelPosteLabel } from '../Utils/personnelUtils.js';

function normalizeList(data) {
    if (Array.isArray(data)) return data;
    return data?.results || [];
}

function isToday(isoDate) {
    if (!isoDate) return false;
    const d = new Date(isoDate);
    const now = new Date();
    return (
        d.getFullYear() === now.getFullYear()
        && d.getMonth() === now.getMonth()
        && d.getDate() === now.getDate()
    );
}

function countByService(personnel, services) {
    const map = {};
    services.forEach((s) => {
        const id = String(s.id ?? s.id_service);
        map[id] = {
            id,
            nom: s.nom_service || s.nom || `Service ${id}`,
            count: 0,
        };
    });
    map._sans = { id: '_sans', nom: 'Non affecté', count: 0 };
    personnel.forEach((p) => {
        const sid = p.service != null ? String(p.service) : '_sans';
        if (!map[sid]) {
            map[sid] = { id: sid, nom: p.service_nom || `Service ${sid}`, count: 0 };
        }
        map[sid].count += 1;
    });
    return Object.values(map).filter((r) => r.count > 0 || r.id !== '_sans');
}

/** Répartition du personnel par poste (ex-tableau de bord administrateur). */
function countByPoste(personnel) {
    const map = {};
    personnel.forEach((p) => {
        const key = String(p.poste || 'autre').toLowerCase();
        if (!map[key]) {
            map[key] = { poste: key, name: getPersonnelPosteLabel(p.poste), value: 0 };
        }
        map[key].value += 1;
    });
    return Object.values(map).sort((a, b) => b.value - a.value);
}

/** Indicateurs d'infrastructure (salles / chambres). */
function buildInfrastructureStats(chambres) {
    const total = chambres.length;
    const placesTotal = chambres.reduce((s, c) => s + (Number(c.nb_places_total) || 0), 0);
    const placesDisponibles = chambres.reduce((s, c) => s + (Number(c.nb_places_disponibles) || 0), 0);
    const tauxOccupation = placesTotal > 0
        ? Math.round(((placesTotal - placesDisponibles) / placesTotal) * 100)
        : 0;
    return { total, placesTotal, placesDisponibles, tauxOccupation };
}

function buildPresenceRows(personnel, auditLogs) {
    const todayLogs = auditLogs.filter((l) => isToday(l.date_action));
    const activityByName = new Map();
    todayLogs.forEach((log) => {
        const key = (log.utilisateur_nom || '').trim().toLowerCase();
        if (!key) return;
        activityByName.set(key, (activityByName.get(key) || 0) + 1);
    });

    return personnel.map((p) => {
        const fullName = `${p.nom || ''} ${p.prenom || ''}`.trim().toLowerCase();
        const actionsToday = activityByName.get(fullName) || 0;
        const statut = p.statut || 'Actif';
        const onLeave = statut !== 'Actif';
        let presence = 'sans_trace';
        if (onLeave) presence = 'absent_prevu';
        else if (actionsToday > 0) presence = 'actif_si';

        return {
            id: getPersonnelUuid(p),
            nom: p.nom,
            prenom: p.prenom,
            poste: p.poste,
            posteLabel: getPersonnelPosteLabel(p.poste),
            serviceNom: p.service_nom || '—',
            statut,
            actionsToday,
            presence,
        };
    });
}

function buildWorkloads(personnel, auditLogs, rapports, besoins) {
    const auditByName = new Map();
    auditLogs.forEach((log) => {
        const key = (log.utilisateur_nom || '').trim().toLowerCase();
        if (!key) return;
        if (!auditByName.has(key)) {
            auditByName.set(key, { actions: 0, lastAction: null, modules: new Set() });
        }
        const row = auditByName.get(key);
        row.actions += 1;
        if (log.module) row.modules.add(log.module);
        const t = log.date_action ? new Date(log.date_action).getTime() : 0;
        if (!row.lastAction || t > row.lastAction) row.lastAction = t;
    });

    const rapportsByUser = new Map();
    rapports.forEach((r) => {
        const uid = String(r.id_expediteur || r.id_emetteur || r.emetteur_id || r.user_id || '');
        if (uid) rapportsByUser.set(uid, (rapportsByUser.get(uid) || 0) + 1);
    });

    const besoinsByUser = new Map();
    besoins.forEach((b) => {
        const uid = String(b.idPersonnel_emetteur || b.demandeurId || '');
        if (uid) besoinsByUser.set(uid, (besoinsByUser.get(uid) || 0) + 1);
    });

    return personnel.map((p) => {
        const pid = getPersonnelUuid(p);
        const nameKey = `${p.nom || ''} ${p.prenom || ''}`.trim().toLowerCase();
        const audit = auditByName.get(nameKey) || { actions: 0, lastAction: null, modules: new Set() };
        return {
            id: pid,
            nom: p.nom,
            prenom: p.prenom,
            posteLabel: getPersonnelPosteLabel(p.poste),
            serviceNom: p.service_nom || '—',
            auditActions: audit.actions,
            auditModules: [...audit.modules].slice(0, 5),
            lastAction: audit.lastAction ? new Date(audit.lastAction).toLocaleString('fr-FR') : '—',
            rapportsCount: rapportsByUser.get(pid) || 0,
            besoinsEmis: besoinsByUser.get(pid) || 0,
        };
    });
}

/**
 * Agrège les données du tableau de bord directeur (lecture seule).
 */
export async function fetchDirectorOverviewData(financeYears = []) {
    const years = financeYears.length
        ? financeYears
        : [new Date().getFullYear() - 1, new Date().getFullYear()];

    const results = await Promise.allSettled([
        getAllPersonnel(),
        getAllServices(),
        getTableauDeBordData(),
        ...years.map((y) => getEvolutionMensuelle(y)),
        getAuditLogs(),
        materielMedicalApi.getAll(),
        materielDurableApi.getAll(),
        besoinApi.getAll(),
        rapportApi.getAll(),
        sortieApi.getAll(),
        axiosInstance.get('/patients/', { params: { page: 1, page_size: 1 } }),
        axiosInstance.get('/visites/', { params: { statut: 'EN_COURS', page_size: 1 } }),
        getAllChambres(),
    ]);

    const pick = (idx, fallback = null) =>
        (results[idx].status === 'fulfilled' ? results[idx].value : fallback);

    const personnelRaw = pick(0, {});
    const personnel = normalizeList(personnelRaw);
    const servicesRaw = pick(1, {});
    const services = normalizeList(servicesRaw);
    const financeKpis = pick(2, null);

    const evolutionByYear = {};
    years.forEach((year, i) => {
        const ev = pick(3 + i, null);
        evolutionByYear[year] = ev?.mois || ev?.evolution_mensuelle || [];
    });

    const auditOffset = 3 + years.length;
    const auditLogs = pick(auditOffset, []) || [];
    const meds = normalizeList(pick(auditOffset + 1, []));
    const durables = normalizeList(pick(auditOffset + 2, []));
    const besoins = normalizeList(pick(auditOffset + 3, []));
    const rapports = normalizeList(pick(auditOffset + 4, []));
    const sorties = normalizeList(pick(auditOffset + 5, []));
    const patientsRes = pick(auditOffset + 6, {});
    const visitesRes = pick(auditOffset + 7, {});
    const chambres = normalizeList(pick(auditOffset + 8, []));

    const patientCount = patientsRes?.data?.count ?? patientsRes?.count ?? null;
    const visitesEnCours = visitesRes?.data?.count ?? visitesRes?.count ?? null;

    const lowStockMed = meds.filter(
        (m) => (m.quantite_stock ?? 0) <= (m.seuil_alerte ?? 20),
    );
    const lowStockDur = durables.filter(
        (m) => (m.quantite_stock ?? m.quantite ?? 0) <= (m.seuil_alerte ?? 5),
    );

    const besoinsEnCours = besoins.filter((b) =>
        ['NON_TRAITE', 'EN_COURS'].includes(b.statut),
    ).length;

    const presence = buildPresenceRows(personnel, auditLogs);
    const workloads = buildWorkloads(personnel, auditLogs, rapports, besoins);

    const actifsToday = presence.filter((p) => p.presence === 'actif_si').length;
    const sansTrace = presence.filter((p) => p.presence === 'sans_trace').length;
    const absencesPrevues = presence.filter((p) => p.presence === 'absent_prevu').length;

    return {
        personnel,
        services,
        personnelByService: countByService(personnel, services),
        personnelByPoste: countByPoste(personnel),
        infrastructure: buildInfrastructureStats(chambres),
        hospital: {
            personnelTotal: personnel.length,
            servicesTotal: services.length,
            chambresTotal: chambres.length,
            patientsEnregistres: patientCount,
            visitesEnCours,
        },
        finance: {
            kpis: financeKpis,
            evolutionByYear,
            years,
        },
        stocks: {
            articlesMedicaux: meds.length,
            articlesDurables: durables.length,
            alertesStock: lowStockMed.length + lowStockDur.length,
            lowStockMed: lowStockMed.slice(0, 8),
            sortiesRecentes: sorties.slice(0, 10),
            besoinsEnCours,
        },
        presence: {
            rows: presence,
            actifsToday,
            sansTrace,
            absencesPrevues,
        },
        rapports: rapports.slice(0, 50),
        workloads,
        errors: results
            .map((r, i) => (r.status === 'rejected' ? i : null))
            .filter((i) => i != null),
    };
}
