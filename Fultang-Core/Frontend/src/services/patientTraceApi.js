import axiosInstance from '../Utils/axiosInstance';

/**
 * Journal de traçabilité des accès dossier patient (Medical Monitoring).
 */
export async function getPatientAccessLogs(params = {}) {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') search.set(k, v);
    });
    const qs = search.toString();
    const url = qs ? `/patient-access-logs/?${qs}` : '/patient-access-logs/';
    const response = await axiosInstance.get(url);
    return response.data.results ?? response.data;
}
