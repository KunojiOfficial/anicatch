import { ApplicationIntegrationType, InteractionContextType, SlashCommandBuilder } from 'discord.js';
import Command from '../../classes/Command.ts';
import Battle from '../../classes/BattleNew.ts';

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

        //testing
        // const battle = new Battle(interaction.client.db, interaction.player.data.id);
        // await battle.initialize(await interaction.client.db.fight.findFirst({ where: { id: 3 } }));

        // await battle.selectAction(536, { type: "Switch", data: { switchTo: 591 } });

        //db speed
        const now = new Date();
        await interaction.client.db.$executeRaw`SELECT 1`;
        const elapsed = (new Date()).getTime() - now.getTime();

        const wsPing = interaction.client.ws.ping;
        const messagePing = message.interaction.createdTimestamp - interaction.createdTimestamp;

        await interaction.editReply({
            flags: [ "IsComponentsV2" ],
            components: interaction.componentsV2.construct([
                { type: "Container", components: [
                    { type: "TextDisplay", text_display_data: { content: `Pong! Shard #${interaction.client.cluster?.id||0}` } },
                    { type: "Separator" },
                    { type: "TextDisplay", text_display_data: { content: `\`${wsPing}ms, ${messagePing}ms, ${elapsed}ms\`` } },
                ] }
            ])
        });

    }
})