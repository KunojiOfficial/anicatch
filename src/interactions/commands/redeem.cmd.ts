import { ApplicationIntegrationType, InteractionContextType, SlashCommandBuilder } from 'discord.js';
import Command from '../../classes/Command.ts';
import redeem from '../../mechanics/redeem.ts';

export default new Command({
    emoji: "💋",
    cooldown: 10,
    data: new SlashCommandBuilder()
        .setName("redeem")
        .setDescription("Redeem purchased items!")
        .setContexts(InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel)
        .setIntegrationTypes(ApplicationIntegrationType.UserInstall, ApplicationIntegrationType.GuildInstall),
    
    async execute(interaction): Promise<void> {
        const entitlements = (await interaction.client.application.entitlements.fetch({ user: interaction.user })).filter(e => e.type === 5 && e.consumed === false);
        
        if (!entitlements.size) throw 67;

        for (const entitlement of entitlements.values()) {
            await redeem(entitlement);
        }

        await interaction.editReply({
            embeds: [ interaction.components.embed({
                description: "{emoji_yes}\u2800{locale_main_redeemSuccess}",
                color: "#00FF00"
            })],
        });
    }
})