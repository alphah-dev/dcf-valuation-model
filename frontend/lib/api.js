import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        "Content-Type": "application/json",
    },
    timeout: 30000,
});

export const api = {
    getHealth: async () => {
        const res = await apiClient.get("/health");
        return res.data;
    },

    searchStocks: async (query, market = null) => {
        const params = { q: query };
        if (market) params.market = market;
        try {
            const res = await apiClient.get("/api/stocks/search", { params });
            return res.data;
        } catch (err) {
            if (err.response?.status === 404) return [];
            throw err;
        }
    },

    getMarketOverview: async (market = null, page = 1, limit = 50) => {
        const params = { page, limit };
        if (market) params.market = market;
        const res = await apiClient.get("/api/stocks/overview", { params });
        return res.data;
    },

    getSectorBreakdown: async () => {
        const res = await apiClient.get("/api/stocks/sector/breakdown");
        return res.data;
    },

    getStockDetails: async (ticker, live = false) => {
        const params = {};
        if (live) params.live = true;
        const res = await apiClient.get(`/api/stocks/${ticker}`, { params });
        return res.data;
    },

    getFinancials: async (ticker, years = 5) => {
        try {
            const res = await apiClient.get(`/api/stocks/${ticker}/financials`, { params: { years } });
            return res.data;
        } catch (err) {
            if (err.response?.status === 404) return { financials: [] };
            throw err;
        }
    },

    getKeyRatios: async (ticker) => {
        try {
            const res = await apiClient.get(`/api/stocks/${ticker}/key-ratios`);
            return res.data;
        } catch (err) {
            if (err.response?.status === 404) return {};
            throw err;
        }
    },

    getPeers: async (ticker) => {
        try {
            const res = await apiClient.get(`/api/stocks/${ticker}/peers`);
            return res.data;
        } catch (err) {
            return [];
        }
    },

    getQuarterly: async (ticker) => {
        try {
            const res = await apiClient.get(`/api/stocks/${ticker}/quarterly`);
            return res.data;
        } catch (err) {
            return { quarters: [] };
        }
    },

    getProsCons: async (ticker) => {
        try {
            const res = await apiClient.get(`/api/stocks/${ticker}/pros-cons`);
            return res.data;
        } catch (err) {
            return { pros: [], cons: [] };
        }
    },

    getHeatmapData: async (market = null) => {
        const params = {};
        if (market) params.market = market;
        const res = await apiClient.get("/api/stocks/heatmap/data", { params });
        return res.data;
    },

    refreshStock: async (ticker) => {
        const res = await apiClient.post(`/api/stocks/${ticker}/refresh`);
        return res.data;
    },

    calculateDCF: async (payload) => {
        const res = await apiClient.post("/api/dcf/calculate", payload);
        return res.data;
    },

    calculateReverseDCF: async (payload) => {
        const res = await apiClient.post("/api/dcf/reverse", payload);
        return res.data;
    },

    calculateSensitivity: async (payload) => {
        const res = await apiClient.post("/api/dcf/sensitivity", payload);
        return res.data;
    },

    getQualityScores: async (ticker) => {
        const res = await apiClient.get(`/api/dcf/quality/${ticker}`);
        return res.data;
    },

    getValuationHistory: async (ticker) => {
        const res = await apiClient.get(`/api/dcf/history/${ticker}`);
        return res.data;
    },

    getPriceHistory: async (ticker, period = "1y") => {
        try {
            const res = await apiClient.get(`/api/stocks/${ticker}/price-history`, { params: { period } })
            return res.data
        } catch {
            return { prices: [], currency: null }
        }
    },

    getTopMovers: async (market = null) => {
        try {
            const params = {}
            if (market) params.market = market
            const res = await apiClient.get("/api/stocks/movers/top", { params })
            return res.data
        } catch {
            return { value_picks: [], growth_picks: [] }
        }
    },
};
