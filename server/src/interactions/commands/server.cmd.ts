import { ApplicationIntegrationType, InteractionContextType, SlashCommandBuilder } from 'discord.js';
import Command from '../../classes/Command.ts';

export default new Command({
    emoji: "🚀",
    cooldown: 2,
    data: new SlashCommandBuilder()
        .setName("server")
        .setDescription("Join our community server!")
        .setContexts(InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel)
        .setIntegrationTypes(ApplicationIntegrationType.UserInstall, ApplicationIntegrationType.GuildInstall),
    
    async execute(interaction): Promise<void> {
        await interaction.editReply({
            embeds: [ interaction.components.embed({
                author: { name: `{locale_main_joinServer} - ${interaction.user.displayName}`, iconUrl: interaction.user.displayAvatarURL() },
                description: `{locale_main_joinServerText}`,
                thumbnail: interaction.client.user.displayAvatarURL()
            }) ],
            components: [ interaction.components.buttons([{
                label: `{locale_main_joinServer}`,
                url: "{config_urls_support}",
                emoji: "discord"
            }]) ]
        })
    }
})