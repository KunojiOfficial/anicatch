import { ApplicationIntegrationType, AttachmentBuilder, InteractionContextType, SlashCommandBuilder } from 'discord.js';
import Command from '../../classes/Command';

export default new Command({
    emoji: "🔥",
    data: new SlashCommandBuilder()
        .setName("types")
        .setDescription("Display a chart showing the strengths and weaknesses of the types.")
        .setContexts(InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel)
        .setIntegrationTypes(ApplicationIntegrationType.UserInstall, ApplicationIntegrationType.GuildInstall),
    
    async execute(interaction): Promise<void> {
        const attachment = new AttachmentBuilder(`./src/assets/others/chart.png`, { name: "chart.png" });

        await interaction.editReply({
            embeds: [ interaction.components.embed({
                image: `attachment://${attachment?.name}`
            }) ],
            files: [attachment]
        })
    }
})