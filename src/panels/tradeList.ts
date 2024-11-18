import { InteractionReplyOptions } from "discord.js";
import { DiscordInteraction } from "../types";
import Panel from "../classes/Panel";

const ON_PAGE = 6;

export default new Panel({
    name: "tradeList",
    async execute(interaction: DiscordInteraction, page: number | string = 1): Promise<InteractionReplyOptions> {
        const { client, player } = interaction;

        if (typeof page === 'string') page = parseInt(page);

        const data = await client.db.user.findFirst({ 
            where: { id: player.data.id }, 
            include: { trades: { where: { status: { not: "CREATING" } }, orderBy: { id: "desc" }, include: { users: true } } } 
        });

        let offers = data?.trades; 
        if (!offers) throw 53;

        offers = [...offers.filter(o => o.status === "ACTIVE"), ...offers.filter(o => o.status !== "ACTIVE")];

        const pageCount = Math.ceil(offers.length/ON_PAGE);
        if (page < 1) page = pageCount;
        else if (page > pageCount) page = 1;

        const fields = [], options = [];
        for (const offer of offers) {
            const otherPerson = offer.users.find(u => u.discordId !== player.user.id);
            const isIncoming = offer.recipientId === player.data.id;

            fields.push({
                name: `Trade #${offer.id}`,
                value: `-# ${isIncoming ? "{emoji_incoming}" : "{emoji_outgoing}"} @${otherPerson?.username}\n-# {emoji_${offer.status}} {locale_main_${offer.status}}`,
                inline: true
            });

            options.push({
                label: `Trade #${offer.id}`,
                value: `1:${offer.id}`,
                description: `@${otherPerson?.username}`,
                emoji: offer.status
            });
        }

        const defaults = {
            id: "0",
            args: { path: "tradeList", page: page }
        }

        return {
            embeds: [ interaction.components.embed({
                author: { name: `${player.user.displayName} - Trade List`, iconUrl: player.user.displayAvatarURL() },
                description: `Use the buttons below to navigate the list of active and past trade offers.\nTo create a new trade offer, use the command {command_trade new}.\n\u2800`,
                fields: fields
            }) ],
            components: [ interaction.components.selectMenu({
                options: options,
                placeholder: `🔁\u2800Select a trade offer to view its details...`
            }), interaction.components.buttons([{
                ...defaults,
                args: { ...defaults.args, page: 1, double: "yes" },
                emoji: "chevron.double.left",
            }, {
                ...defaults,
                args: { ...defaults.args, page: page-1 },
                emoji: "chevron.single.left"
            }, {
                id: '5',
                label: `\u2800Page ${page} / ${pageCount}\u2800`,
                args: { min: 1, max: pageCount, index: 1, customId: Object.values(defaults.args).join(':') }
            }, {
                ...defaults,
                args: { ...defaults.args, page: page+1 },
                emoji: "chevron.single.right"
            }, {
                ...defaults,
                args: { ...defaults.args, page: pageCount, double: "yes2" },
                emoji: "chevron.double.right"
            }]) ]
        }
    }
}); 