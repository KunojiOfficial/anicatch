import { SlashCommandBuilder } from 'discord.js';
import Command from '../classes/Command';

export default new Command({
    emoji: "🏓",
    dontReply: true,
    data: new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Pong!"),
    async execute(interaction): Promise<void> {
        const message = await interaction.deferReply({ fetchReply: true });

        //db speed
        const now = new Date();
        await interaction.client.db.$executeRaw`SELECT 1`;
        const elapsed = (new Date()).getTime() - now.getTime();

        await interaction.editReply({
            embeds: [
                interaction.components.embed({
                    description: `Pong! Shard #${interaction.guild !== undefined ? interaction.guild?.shardId : -1}\n\n\`${interaction.client.ws.ping}ms, ${message.createdTimestamp - interaction.createdTimestamp}ms, ${elapsed}ms\``
                })
            ]
        });
    }
})