import { ApplicationIntegrationType, InteractionContextType, SlashCommandBuilder } from 'discord.js';
import Command from '../../classes/Command.ts';

export default new Command({
    emoji: "🔗",
    cooldown: 2,
    panel: "referral",
    data: new SlashCommandBuilder()
        .setName("referral")
        .setDescription("Invite your friends to earn rewards!")
        .setContexts(InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel)
        .setIntegrationTypes(ApplicationIntegrationType.UserInstall, ApplicationIntegrationType.GuildInstall)
})