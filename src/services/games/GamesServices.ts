import api from '../api';

export async function openBox(id: string, quantity: number) {
    const response = await api.post(`/games/openCase/${id}`, {
        quantity: quantity || 1
    });
    return response.data;
}

export async function upgradeItem(selectedItemIds: string[], targetItemId: string) {
    const response = await api.post(`/games/upgrade/`, { selectedItemIds, targetItemId });
    return response.data;
}

export async function spinSlots(betAmount: number) {
    const response = await api.post(`/games/slots/`, {
        betAmount
    });
    return response.data;
}

// --- Mines ---
export async function minesActive() {
    const response = await api.get('/games/mines/active');
    return response.data;
}

export async function minesStart(betAmount: number, minesCount: number) {
    const response = await api.post('/games/mines/start', { betAmount, minesCount });
    return response.data;
}

export async function minesReveal(tileIndex: number) {
    const response = await api.post('/games/mines/reveal', { tileIndex });
    return response.data;
}

export async function minesCashout() {
    const response = await api.post('/games/mines/cashout');
    return response.data;
}

// --- Gladiator Road (Crixus Chicken Road) ---
export async function roadActive() {
    const response = await api.get('/games/road/active');
    return response.data;
}

export async function roadStart(betAmount: number, difficulty: string) {
    const response = await api.post('/games/road/start', { betAmount, difficulty });
    return response.data;
}

export async function roadStep() {
    const response = await api.post('/games/road/step');
    return response.data;
}

export async function roadCashout() {
    const response = await api.post('/games/road/cashout');
    return response.data;
}
