import { SlashCommandBuilder } from 'discord.js';
import Command from '../classes/Command';

export default new Command({
    emoji: "🃏",
    cooldown: 2,
    data: new SlashCommandBuilder()
        .setName("anidex")
        .setDescription("all cards!")
        .addStringOption(option =>
            option.setName("id")
            .setDescription("The ID(s) of the selected Animon(s). Max 5, separated by commas.")
        ) as SlashCommandBuilder,
    async execute(interaction) {
        const { options } = interaction;
        const ids = options.getString("id")?.toUpperCase()?.split(",");

        if (!ids?.length) {
            await interaction.editReply(await interaction.client.panels.get("anidex")!.execute!(interaction, 1));
            return;
        }

        for (const [i, id] of ids.entries()) {
            if (i > 4) break;

            const message = await interaction.client.panels.get("anidex")?.execute!(interaction, id.replace(/[^a-zA-Z]/g, ''));
            if (!message) continue;

            if (i === 0) await interaction.editReply(message);
            else await interaction.followUp(message);
        }

        return;
    }
})