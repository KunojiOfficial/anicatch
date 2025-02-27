import { ApplicationIntegrationType, InteractionContextType, InteractionReplyOptions, SlashCommandBuilder } from 'discord.js';
import Command from '../../classes/Command';
import launchActivity from 'src/mechanics/launchActivity';

export default new Command({
    emoji: {
        start: "🔥",
        resume: "🔁"
    },
    dontReply: true,
    data: new SlashCommandBuilder()
        .setName("battle")
        .setDescription("ddd")
        .setContexts(InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel)
        .setIntegrationTypes(ApplicationIntegrationType.UserInstall, ApplicationIntegrationType.GuildInstall)
        .addSubcommand(subcommand => subcommand
            .setName("start")
            .setDescription("Start a new battle!")
            .addUserOption(option => option
                .setName("user")
                .setDescription("The person you want to battle (they must be on this server).")
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand => subcommand
            .setName("resume")
            .setDescription("Resume your battle.")
        ) as SlashCommandBuilder,

    async execute(interaction) {
        const { client, player } = interaction;
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'resume') await launchActivity(interaction);
        else if (subcommand === 'start') {
            await interaction.deferReply();

            const user = interaction.options.getUser("user");
            
            const enemyPlayer = await client.db.user.findFirst({ where: { discordId: user.id } });
            if (!enemyPlayer) throw 7;

            const [battle, enemyBattle] = await Promise.all([
                client.db.battle.findFirst({ where: { OR: [{ userId1: player.data.id }, { userId2: player.data.id }], status: "ACTIVE" } }),
                client.db.battle.findFirst({ where: { OR: [{ userId1: enemyPlayer.id }, { userId2: enemyPlayer.id }], status: "ACTIVE" } })
            ]);

            if (battle) throw 54;
            if (enemyBattle) throw 57;

            await interaction.editReply({
                content: `${user} ${interaction.user}`,
                embeds: [ interaction.components.embed({
                    author: { name: `${interaction.user.displayName} - Battle Challenge`, iconUrl: interaction.user.displayAvatarURL() },
                    description: `${user} has been challenged to a battle by ${interaction.user}!\nThe challenged player must accept the challenge by using the button below.`,
                }) ],
                components: [ interaction.components.buttons([{
                    id: '18',
                    owner: user.id,
                    label: "Accept",
                    style: "green",
                    emoji: "wyes",
                    args: { challenger: player.data.id }
                }]) ]
            });
        }

        // await interaction.editReply(message!)
    }
});