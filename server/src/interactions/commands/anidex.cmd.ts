import { ApplicationIntegrationType, InteractionContextType, SlashCommandBuilder } from 'discord.js';
import Command from '../../classes/Command';

export default new Command({
    emoji: "🔍",
    cooldown: 2,
    data: new SlashCommandBuilder()
        .setName("anidex")
        .setDescription("View the details of a specific Animon or browse through all of them!")
        .setContexts(InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel)
        .setIntegrationTypes(ApplicationIntegrationType.UserInstall, ApplicationIntegrationType.GuildInstall)
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