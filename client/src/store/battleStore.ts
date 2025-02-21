import { create } from "zustand";
import { discordSdk } from "../utils/setupDiscordSdk"; // Import discordSdk
import { RPCCloseCodes } from "@discord/embedded-app-sdk";

interface BattleState {
    battle: { type: string; [key: string]: any } | null;
    targetMove: { type: string; [key: string]: any } | null;
    setBattle: (battle: unknown) => void;
    intervalId: NodeJS.Timeout | null;
    connect: () => void;
    error: string | null;
}

export const useBattleStore = create<BattleState>((set, get) => ({
    battle: null,
    targetMove: null,
    setBattle: (battle) => set({ battle }),
    setTargetMove: (targetMove) => set({ targetMove }),
    intervalId: null,
    error: null,
    connect: () => {
        console.log("Starting HTTP polling...");

        const fetchBattleUpdates = async () => {
            const discordId = localStorage.getItem("discordId");
            if (!discordId) return;

            try {
                console.log("🔍 Fetching battle updates...");

                const response = await fetch(`/.proxy/api/battle`, {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
                        "Content-Type": "application/json",
                    },
                });

                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

                const data = await response.json();
                if (data.type === "UPDATE_BATTLE") {
                    console.log("🔄 Battle updated:", data);
                    set({ battle: data });
                    set({ error: null });

                    const currentUser = data.users.find((user: any) => user.discordId === discordId);
                    const targetMove = data.userId1 === currentUser.id ? data.move1 : data.move2;

                    set({ targetMove: targetMove });

                    // Check if battle.turn is enemy's before starting polling
                    if (targetMove && !get().intervalId) {
                        console.log("🔄 Starting polling...");
                        const intervalId = setInterval(fetchBattleUpdates, 2100);
                        set({ intervalId });
                    } else if (!targetMove) {
                        console.log("🛑 Stopping polling...");
                        clearInterval(get().intervalId);
                        set({ intervalId: null });
                    }
                } else if (data.type === "BATTLE_NOT_FOUND") {
                    console.log("🛑 Battle not found, closing Discord SDK...");
                    discordSdk.close(RPCCloseCodes.CLOSE_NORMAL, "You exited from the app."); // Close the Discord SDK
                }

            } catch (error) {
                console.error("HTTP polling error:", error);
                set({ error: error.message });
            }
        };

        // Initial fetch to check battle state
        fetchBattleUpdates();
    }
}));
