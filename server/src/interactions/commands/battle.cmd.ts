import { ApplicationIntegrationType, InteractionContextType, SlashCommandBuilder } from 'discord.js';
import Command from '../../classes/Command';
import launchActivity from 'src/mechanics/launchActivity';

export default new Command({
    emoji: "🃏",
    cooldown: 2,
    dontReply: true,
    data: new SlashCommandBuilder()
        .setName("battle")
        .setDescription("Open the battle")
        .setContexts(InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel)
        .setIntegrationTypes(ApplicationIntegrationType.UserInstall, ApplicationIntegrationType.GuildInstall),
    async execute(interaction) {
        await launchActivity(interaction);
    }
})