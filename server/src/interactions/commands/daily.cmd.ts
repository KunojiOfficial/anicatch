import { ApplicationIntegrationType, InteractionContextType, SlashCommandBuilder } from 'discord.js';
import Command from '../../classes/Command';
import { addHours } from '../../helpers/utils';

function isMoreThan24HoursAgo(givenDate: Date) {
    const now = new Date();
    const differenceInMilliseconds = now.getTime() - givenDate.getTime();
    return differenceInMilliseconds >= (24 * 60 * 60 * 1000);
}

export default new Command({
    emoji: "🎁",
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName("daily")
        .setDescription("Claim your free daily AniBalls and other rewards!")
        .setContexts(InteractionContextType.BotDM, InteractionContextType.Guild, InteractionContextType.PrivateChannel)
        .setIntegrationTypes(ApplicationIntegrationType.UserInstall, ApplicationIntegrationType.GuildInstall),
    
    async execute(interaction): Promise<void> {
        const { client, player } = interaction;
    
        if (!isMoreThan24HoursAgo(player.data.lastDaily)) {
            await interaction.editReply({ embeds: [interaction.components.embed({
                description: `{emoji_no}\u2800{locale_errors_37}`,
                color: "#ff0000"
            }, {
                time: [ client.unixDate(addHours(player.data.lastDaily, 24)) ]
            })] });

            return;
        }
        
        const rewards: [{id: number, count: number}] = (player.role?.daily || []) as [{id: number, count: number}];
        if (!rewards.length) return;

        const items = await client.db.item.findMany({ where: { id: { in: rewards.map(r => r.id) } } });

        const promises = [], texts = [];
        for (const reward of rewards) {
            const item = items.find(i => i.id === reward.id);
            texts.push(`${item?.emoji} **{locale_items_${item?.name}_name}** x${reward.count}`);
            promises.push(client.db.inventory.upsert({
                where: { itemId_userId: { userId: player.data.id, itemId: reward.id } },
                update: { count: { increment: reward.count } },
                create: { userId: player.data.id, itemId: reward.id, count: reward.count }
            }));
        }

        await client.db.user.updateMany({ where: { id: player.data.id }, data: { lastDaily: new Date() } })
        await Promise.all(promises);

        await interaction.editReply({
            embeds: [ interaction.components.embed({
                description: `{locale_main_dailyText}\n\n* ${texts.join('\n* ')}`
            }) ]
        });
    }
});