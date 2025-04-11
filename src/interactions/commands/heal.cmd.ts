import { ApplicationIntegrationType, InteractionContextType, SlashCommandBuilder } from 'discord.js';
import Command from '../../classes/Command.ts';

import { DiscordInteraction } from '../../types.ts';
import { getHealableCards, healCost } from '../../mechanics/heal.ts';

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

        const toHeal = await getHealableCards(client.db, player.data.id);
        const cost = healCost * toHeal;

        if (!toHeal) return await interaction.editReply({ 
            embeds: [ interaction.components.embed({
                description: "{emoji_no}\u2800{locale_main_noCards}",
                color: "#ff0000"
            }) ],
            flags: "Ephemeral"  
        });

        return await interaction.editReply({
            embeds: [ interaction.components.embed({
                author: { name: `{locale_main_heal} - ${player.user.displayName}`, iconUrl: player.user.displayAvatarURL() },
                description: "{locale_main_healCost}",
            }, {
                count: [`**{number_${toHeal}}**`],
                cost: [`**{number_${cost}}**`]
            }) ],
            components: [ interaction.components.buttons([{
                label: "{locale_main_accept}",
                id: "25",
                emoji: "wyes",
                style: "green",
                cooldown: { id: "heal", time: 5 }
            }]) ]
        });

    }
})