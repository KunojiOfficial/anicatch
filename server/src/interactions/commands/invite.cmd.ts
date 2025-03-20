import { ApplicationIntegrationType, InteractionContextType, SlashCommandBuilder } from 'discord.js';
import Command from '../../classes/Command.ts';

export default new Command({
    emoji: "💌",
    cooldown: 2,
    data: new SlashCommandBuilder()
        .setName("invite")
        .setDescription("Invite the bot to your server!")
        .setContexts(InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel)
        .setIntegrationTypes(ApplicationIntegrationType.UserInstall, ApplicationIntegrationType.GuildInstall),
    
    async execute(interaction): Promise<void> {
        await interaction.editReply({
            embeds: [ interaction.components.embed({
                author: { name: `{locale_main_inviteBot} - ${interaction.user.displayName}`, iconUrl: interaction.user.displayAvatarURL() },
                description: `{locale_main_inviteBotText}`,
                thumbnail: interaction.client.user.displayAvatarURL()
            }) ],
            components: [ interaction.components.buttons([{
                label: `{locale_main_inviteBot}`,
                url: "{config_urls_invite}",
                emoji: "discord"
            }]) ]
        })
    }
})