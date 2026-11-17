import axios from "axios";
import { getGatewayBaseUrl } from "./gatewayUrls";
import { setupAuthRefresh } from "./setupAuthRefresh.js";

const axiosInstance = axios.create({
    baseURL: `${getGatewayBaseUrl()}/medical`,
    headers: {
        'Content-Type': 'application/json'
    }
});

axiosInstance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("token_key_fultang");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
            delete config.headers['Content-Type'];
        }
        return config;
    },
    (error) => Promise.reject(error),
);

setupAuthRefresh(axiosInstance);

export default axiosInstance;
