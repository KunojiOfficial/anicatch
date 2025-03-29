import { ApplicationIntegrationType, InteractionContextType, SlashCommandBuilder } from 'discord.js';
import Command from '../../classes/Command.ts';

import codes from "../../config/promo.json";

export default new Command({
    emoji: "💸",
    cooldown: 2,
    data: new SlashCommandBuilder()
        .setName("promo")
        .setDescription("Complete tasks in the bot and earn rewards in partnered apps!")
        .setContexts(InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel)
        .setIntegrationTypes(ApplicationIntegrationType.UserInstall, ApplicationIntegrationType.GuildInstall),
    
    async execute(interaction): Promise<void> {
        const { client, player } = interaction;

        const stats = await client.db.userStats.findFirst({ where: { userId: player.data.id } });
        const captured = stats.captured || 0;

        const promo = await client.db.promo.findMany();
        if (promo.find(p => p.userId === player.data.id)) throw 71;

        const toCapture = 5 - captured;
        let msg = "";
        if (toCapture <= 0) {
            const code = codes.nazuna.find(c => !promo.map(p => p.code).includes(c));
            if (!code) throw 72;

            await client.db.promo.create({ data: { userId: player.data.id, code: code } });
            await interaction.user.send(client.formatText(`{locale_main_clickToShow} -> ||\`${code}\`||`, interaction.locale));

            msg = "{locale_main_successRewards}";
        } else {
            msg = "{locale_main_toCapture}";
        }

        await interaction.editReply({
            embeds: [ interaction.components.embed({
                description: msg
            }, {
                toCapture: [`**${toCapture}**`]
            })],
        });
    }
})