import { Server, WebSocket } from "ws";
import { Server as HttpServer } from "http";
import { setupBattleWebSocket } from "./battleWs";

const activeConnections = new Map<string, WebSocket>();

export function setupWebSocket(server: HttpServer) {
    const wss = new Server({ server });

    wss.on("connection", (ws) => {
        console.log("✅ Client connected to WebSocket");

        ws.on("message", (message) => {
            try {
                const data = JSON.parse(message.toString());
                setupBattleWebSocket(ws, data, activeConnections);
            } catch (error) {
                console.error("❌ Invalid WebSocket message", error);
            }
        });

        ws.on("close", () => {
            console.log("❌ Client disconnected");
            for (const [key, client] of activeConnections.entries()) {
                if (client === ws) {
                    activeConnections.delete(key);
                    break;
                }
            }
        });
    });
}
