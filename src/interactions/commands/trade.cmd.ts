import { ApplicationIntegrationType, InteractionContextType, InteractionReplyOptions, SlashCommandBuilder } from 'discord.js';
import Command from '../../classes/Command';

export default new Command({
    emoji: {
        new: "🔃"
    },
    data: new SlashCommandBuilder()
        .setName("trade")
        .setDescription("ddd")
        .setContexts(InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel)
        .setIntegrationTypes(ApplicationIntegrationType.UserInstall, ApplicationIntegrationType.GuildInstall)
        .addSubcommand(subcommand => subcommand
            .setName("new")
            .setDescription("Initiate a new trade offer!")
            .addUserOption(option => option
                .setName("user")
                .setDescription("The person you want to trade with (they must be on this server).")
                .setRequired(true)
            )
        ) as SlashCommandBuilder,

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        let message;

        if (subcommand === 'new') message = await interaction.client.panels.get("tradeCreator")?.execute!(interaction, undefined, interaction.options.getUser("user"));

        await interaction.editReply(message!)
    }
});