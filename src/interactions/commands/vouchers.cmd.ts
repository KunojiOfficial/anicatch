import { ApplicationIntegrationType, InteractionContextType, SlashCommandBuilder } from 'discord.js';
import Command from '../../classes/Command';

export default new Command({
    emoji: "🎟️",
    data: new SlashCommandBuilder()
        .setName("vouchers")
        .setDescription("Redeem your vouchers!")
        .setContexts(InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel)
        .setIntegrationTypes(ApplicationIntegrationType.UserInstall, ApplicationIntegrationType.GuildInstall),
    panel: "vouchers"
});