import { DiscordInteraction } from "../types.ts";
import axios from 'axios';

export default async function launchActivity(interaction: DiscordInteraction) {
    const url = `https://discord.com/api/v10/interactions/${interaction.id}/${interaction.token}/callback`;
    try {
        const response = await axios.post(url, JSON.stringify({type:12}), {
            headers: { "Content-Type": "application/json" }
        });
      } catch (error: any) {
        if (error.response) {
            console.error("Error status:", error.response.status);
            console.error("Error details:", error.response.data);
        } else {
            console.error("Request error:", error.message);
        }
      }
}