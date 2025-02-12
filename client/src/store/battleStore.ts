import { create } from "zustand";

interface BattleState {
    battle: { type: string; [key: string]: any } | null;
    setBattle: (battle: unknown) => void;
    intervalId: NodeJS.Timeout | null;
    connect: (discordId: string) => void;
}

export const useBattleStore = create<BattleState>((set) => ({
    battle: null,
    setBattle: (battle) => set({ battle }),
    intervalId: null,
    connect: (discordId: string) => {
        console.log("Starting HTTP polling...");

        const fetchBattleUpdates = async () => {
            try {
                console.log("🔍 Fetching battle updates...");

                const response = await fetch(`/.proxy/api/battle/${discordId}`, {
                    method: "POST"
                });

                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

                const data = await response.json();
                if (data.type === "UPDATE_BATTLE") {
                    console.log("🔄 Battle updated:", data);
                    set({ battle: data });
                }

            } catch (error) {
                console.error("HTTP polling error:", error);
            }
        };

        // Start polling every 5 seconds
        const intervalId = setInterval(fetchBattleUpdates, 2100);
        set({ intervalId });
    }
}));
