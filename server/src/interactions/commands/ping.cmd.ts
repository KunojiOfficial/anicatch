import { ApplicationIntegrationType, InteractionContextType, SlashCommandBuilder } from 'discord.js';
import Command from '../../classes/Command';

export default new Command({
    emoji: "🏓",
    dontReply: true,
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Pong!")
        .setContexts(InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel)
        .setIntegrationTypes(ApplicationIntegrationType.UserInstall, ApplicationIntegrationType.GuildInstall),
    async execute(interaction): Promise<void> {
        const message = await interaction.deferReply({ withResponse: true });

        //db speed
        const now = new Date();
        await interaction.client.db.$executeRaw`SELECT 1`;
        const elapsed = (new Date()).getTime() - now.getTime();

        await interaction.editReply({
            embeds: [
                interaction.components.embed({
                    description: `Pong! Shard #${interaction.guild !== undefined ? (interaction.guild?.shardId||-1) : -1}\n\n\`${interaction.client.ws.ping}ms, ${message.interaction.createdTimestamp - interaction.createdTimestamp}ms, ${elapsed}ms\``
                })
            ]
        });
    }
})