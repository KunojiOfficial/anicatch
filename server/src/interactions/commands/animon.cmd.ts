import { ApplicationIntegrationType, InteractionContextType, SlashCommandBuilder } from 'discord.js';
import Command from '../../classes/Command';

export default new Command({
    emoji: "🃏",
    cooldown: 2,
    aliases: ["card"],
    data: new SlashCommandBuilder()
        .setName("animon")
        .setDescription("View the details of the selected Animon(s)!")
        .setContexts(InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel)
        .setIntegrationTypes(ApplicationIntegrationType.UserInstall, ApplicationIntegrationType.GuildInstall)
        .addStringOption(option =>
            option.setName("id")
            .setDescription("The ID(s) of the selected Animon(s). Max 5, separated by commas.")
            .setRequired(true)
        ) as SlashCommandBuilder,
    async execute(interaction) {
        const { options } = interaction;
        const ids = options.getString("id")?.toUpperCase().split(",");
        if (!ids?.length) return;

        for (const [i, id] of ids.entries()) {
            if (i > 4) break;
            const message = await interaction.client.panels.get("animon")?.execute!(interaction, id, true);
            if (!message) continue;

            if (i === 0) await interaction.editReply(message);
            else await interaction.followUp(message);
        }

        return;
    }
})