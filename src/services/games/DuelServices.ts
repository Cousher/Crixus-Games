import api from "../api";

export async function getLiveFeed() {
  const response = await api.get("/games/live-feed");
  return response.data;
}

export async function getMyDuels() {
  const response = await api.get("/games/duel/mine");
  return response.data;
}

export async function getDuel(code: string) {
  const response = await api.get(`/games/duel/${encodeURIComponent(code)}`);
  return response.data;
}

export async function createDuel(betAmount: number, side: "heads" | "tails") {
  const response = await api.post("/games/duel/create", { betAmount, side });
  return response.data;
}

export async function joinDuel(code: string) {
  const response = await api.post(`/games/duel/${encodeURIComponent(code)}/join`);
  return response.data;
}

export async function cancelDuel(code: string) {
  const response = await api.post(`/games/duel/${encodeURIComponent(code)}/cancel`);
  return response.data;
}
