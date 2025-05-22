import { ApplicationIntegrationType, InteractionContextType, SlashCommandBuilder } from 'discord.js';
import Command from '../../classes/Command.ts';

export default new Command({
    emoji: "📝",
    panel: "changelog",
    data: new SlashCommandBuilder()
        .setName("changelog")
        .setDescription("Check the latest updates and changes!")
        .setContexts(InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel)
        .setIntegrationTypes(ApplicationIntegrationType.UserInstall, ApplicationIntegrationType.GuildInstall)
})