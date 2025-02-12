import { WebSocket } from "ws";
import { getBattle } from "../services/battleService";

export function setupBattleWebSocket(ws: WebSocket, data: { type: string; discordId: string }, activeConnections: Map<string, WebSocket>) {
    if (data.type === "JOIN_BATTLE") {
        activeConnections.set(data.discordId, ws);
        sendBattleUpdate(data.discordId, activeConnections);
    }
}

export async function sendBattleUpdate(discordId: string, activeConnections: Map<string, WebSocket>) {
    const battle = await getBattle(discordId);
    const ws = activeConnections.get(discordId);
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "UPDATE_BATTLE", battle }));
    }
}
