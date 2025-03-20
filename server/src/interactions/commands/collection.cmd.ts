import { ApplicationIntegrationType, InteractionContextType, SlashCommandBuilder } from 'discord.js';
import Command from '../../classes/Command.ts';

export default new Command({
    emoji: "💿",
    cooldown: 2,
    data: new SlashCommandBuilder()
        .setName("collection")
        .setDescription("View and browse your Animon collection!")
        .setContexts(InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel)
        .setIntegrationTypes(ApplicationIntegrationType.UserInstall, ApplicationIntegrationType.GuildInstall)
        .addUserOption(option => option
            .setName("user")
            .setDescription("The user whose collection you want to see.")
        ) as SlashCommandBuilder,
    async execute(interaction): Promise<void> {
        let user = interaction.user;
        if (interaction.options && interaction.options.getUser("user")) user = interaction.options.getUser("user") || interaction.user;

        await interaction.editReply(await interaction.client.panels.get("collection")!.execute!(interaction, undefined, user));
    }
})