import React, { useEffect, useRef } from 'react';
import axios from 'axios';
import { API_BASE } from '../utils/apiBase';
import { useToast } from './ToastProvider';

export default function GlobalAdminWidget() {
    const containerRef = useRef(null);
    const { showToast } = useToast();

    useEffect(() => {
        const fetchWidget = async () => {
            const token = localStorage.getItem('token');
            if (!token) return;
            try {
                const res = await axios.get(`${API_BASE}/api/afrakoush/global-admin-widget`, {
                    headers: { 'x-auth-token': token }
                });
                if (res.data && res.data.html !== undefined && !res.data.isEmpty) {
                    if (containerRef.current) {
                        containerRef.current.innerHTML = res.data.html;
                        if (res.data.script) {
                            try {
                                const executeTool = new Function('apiClient', 'container', 'showToast', `
                                    try {
                                        ${res.data.script}
                                    } catch(e) {
                                        console.error("Global admin widget script error:", e);
                                    }
                                `);
                                const apiClient = axios.create({
                                    baseURL: API_BASE,
                                    headers: { 'x-auth-token': token }
                                });
                                executeTool(apiClient, containerRef.current, showToast);
                            } catch (e) {
                                console.error("Failed to parse widget script:", e);
                            }
                        }
                    }
                }
            } catch (err) {
                // Silently ignore 404s/403s if not handled by isEmpty
            }
        };
        fetchWidget();
    }, []);

    return <div ref={containerRef} className="global-admin-widget-container" style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 9999 }} />;
}
