import { ApplicationIntegrationType, InteractionContextType, SlashCommandBuilder } from 'discord.js';
import Command from '../../classes/Command.ts';

import { DiscordInteraction } from '../../types.ts';
import heal from '../../mechanics/heal.ts';

export default new Command({
    emoji: "🩹",
    cooldown: 10,
    data: new SlashCommandBuilder()
        .setName("heal")
        .setDescription("Heal and revive your Animons!")
        .setContexts(InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel)
        .setIntegrationTypes(ApplicationIntegrationType.UserInstall, ApplicationIntegrationType.GuildInstall),
    async execute(interaction: DiscordInteraction) {
        const { client, player } = interaction;

        const healedCards = await heal(client.db, player.data.id);

        if (!healedCards) return await interaction.editReply({ 
            embeds: [ interaction.components.embed({
                description: "{emoji_no}\u2800{locale_main_noCards}",
                color: "#ff0000"
            }) ],
            flags: "Ephemeral"  
        });

        return await interaction.editReply({
            embeds: [ interaction.components.embed({
                description: "{emoji_yes}\u2800{locale_main_healSuccess}",
                color: "#00ff00"
            }, {
                count: [healedCards]
            }) ],
        });

    }
})