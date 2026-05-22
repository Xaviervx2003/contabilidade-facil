import React, { useState, useEffect } from 'react';
import { CCard, CCardBody } from '@coreui/react';
import api from '../services/api';

export const StreakBadge = ({ matricula }) => {
    const [streak, setStreak] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStreak = async () => {
            try {
                const res = await api.get(`/api/aluno/streak/${matricula}`);
                setStreak(res.data);
            } catch (err) {
                console.error('Erro ao buscar streak:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchStreak();
        // Recarregar a cada 60 segundos
        const interval = setInterval(fetchStreak, 60000);
        return () => clearInterval(interval);
    }, [matricula]);

    if (loading) return <div>Carregando...</div>;
    if (!streak) return null;

    return (
        <div className="d-flex align-items-center gap-2">
            <span style={{ fontSize: '24px' }}>
                {streak.emoji === '🔥' ? '🔥' : '❄️'}
            </span>
            <span style={{ fontWeight: 'bold', fontSize: '16px' }}>
                {streak.dias_atuais} dias
            </span>
            <small className="text-muted">
                (máximo: {streak.dias_maximo})
            </small>
        </div>
    );
};