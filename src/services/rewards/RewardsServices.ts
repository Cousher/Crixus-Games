import api from '../api';

export async function getRewardsStatus() {
    const response = await api.get('/rewards/status');
    return response.data;
}

export async function claimStreak() {
    const response = await api.post('/rewards/streak/claim');
    return response.data;
}

export async function claimMission(key: string) {
    const response = await api.post('/rewards/missions/claim', { key });
    return response.data;
}

export async function claimLevelRewards() {
    const response = await api.post('/rewards/level/claim');
    return response.data;
}
