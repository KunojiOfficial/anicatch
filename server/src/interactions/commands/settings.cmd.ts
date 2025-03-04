import { ApplicationIntegrationType, InteractionContextType, SlashCommandBuilder } from 'discord.js';
import Command from '../../classes/Command';

export default new Command({
    emoji: "🔧",
    panel: "settings",
    data: new SlashCommandBuilder()
        .setName("settings")
        .setDescription("Edit the user settings, such as mobile version, language and more!")
        .setContexts(InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel)
        .setIntegrationTypes(ApplicationIntegrationType.UserInstall, ApplicationIntegrationType.GuildInstall),
})