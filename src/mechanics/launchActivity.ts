import { DiscordInteraction } from "../types";
import axios from 'axios';

export default async function launchActivity(interaction: DiscordInteraction) {
    const url = `https://discord.com/api/v10/interactions/${interaction.id}/${interaction.token}/callback`;
    await axios.post(url, JSON.stringify({type: 12}));
}