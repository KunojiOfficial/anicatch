/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from "zustand";

interface BattleState {
    battle: { type: string; [key: string]: any } | null;
    targetMove: { type: string; [key: string]: any } | null;
    battleFinished: boolean | null;
    setBattle: (battle: { type: string; [key: string]: any } | null) => void;
    setBattleFinished: (battleFinished: boolean | null) => void;
    intervalId: NodeJS.Timeout | null;
    connect: () => void;
    error: string | null;
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000"; 

export const useBattleStore = create<BattleState>((set, get) => ({
    battle: null,
    targetMove: null,
    battleFinished: null,
    setBattle: (battle) => set({ battle: battle as { type: string; [key: string]: any } | null }),
    setTargetMove: (targetMove) => set({ targetMove }),
    setBattleFinished: (battleFinished: boolean | null) => set({ battleFinished }),
    intervalId: null,
    error: null,
    connect: () => {
        console.log("Starting HTTP polling...");

        const fetchBattleUpdates = async () => {
            const discordId = localStorage.getItem("discordId");
            if (!discordId) return;

            try {
                console.log("🔍 Fetching battle updates...");

                const response = await fetch(`${API_URL}/api/battle`, {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
                        "Content-Type": "application/json",
                    },
                });

                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

                const data = await response.json();
                
                if (data.type === "UPDATE_BATTLE") {
                    set({ battle: data });
                    set({ error: null });

                    console.log("🔄 Battle updated:", data);
                    
                    const currentUser = data.user1.discordId === discordId ? data.user1 : data.user2;
                    const targetMove = data.battle.userId1 === currentUser.id ? data.battle.move1 : data.battle.move2;

                    set({ targetMove: targetMove });

                    // Check if battle.turn is enemy's before starting polling
                    if (targetMove && !get().intervalId) {
                        console.log("🔄 Starting polling...");
                        const intervalId = setInterval(fetchBattleUpdates, 2100);
                        set({ intervalId });
                    } else if (!targetMove) {
                        console.log("🛑 Stopping polling...");
                        clearInterval(get().intervalId as any);
                        set({ intervalId: null });
                    }
                } else if (data.type === "BATTLE_NOT_FOUND") {
                    set({ battleFinished: true });
                    clearInterval(get().intervalId as any);
                    set({ intervalId: null });
                    // discordSdk.close(RPCCloseCodes.CLOSE_NORMAL, "You exited from the app."); // Close the Discord SDK
                }

                
            } catch (error) {
                console.error("HTTP polling error:", error);
                if (error instanceof Error) {
                    set({ error: error.message });
                } else {
                    set({ error: String(error) });
                }
            }
        };

        // Initial fetch to check battle state
        fetchBattleUpdates();
    }
}));
