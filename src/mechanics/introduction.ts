import { InteractionReplyOptions } from "discord.js";
import { DiscordInteraction } from "../types";

export default async function(interaction: DiscordInteraction) {
    await interaction.reply("hej");
}