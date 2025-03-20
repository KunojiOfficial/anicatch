import { InteractionReplyOptions } from "discord.js";
import { DiscordInteraction } from "../types";
import Panel from "../classes/Panel";

const ON_PAGE = 9;

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
                name: `{locale_main_tradeOffer} #${offer.id}`,
                value: `-# ${isIncoming ? "{emoji_incoming}" : "{emoji_outgoing}"} @${otherPerson?.username}\n-# {emoji_${offer.status}} {locale_main_${offer.status}}`,
                inline: true
            });

            options.push({
                label: `{locale_main_tradeOffer} #${offer.id}`,
                value: `1:${offer.id}`,
                description: `@${otherPerson?.username}`,
                emoji: offer.status
            });
        }

        while (fields.length%3 !== 0) fields.push({ name: "\u2800", value: "\u2800", inline: true });

        const defaults = {
            id: "0",
            args: { path: "tradeList", page: page }
        }

        const components = [interaction.components.buttons([{
            ...defaults,
            args: { ...defaults.args, page: 1, double: "yes" },
            emoji: "chevron.double.left",
        }, {
            ...defaults,
            args: { ...defaults.args, page: page-1 },
            emoji: "chevron.single.left"
        }, {
            id: '5',
            label: `\u2800{locale_main_page} ${page} / ${pageCount}\u2800`,
            args: { min: 1, max: pageCount, index: 1, customId: Object.values(defaults.args).join(':') }
        }, {
            ...defaults,
            args: { ...defaults.args, page: page+1 },
            emoji: "chevron.single.right"
        }, {
            ...defaults,
            args: { ...defaults.args, page: pageCount, double: "yes2" },
            emoji: "chevron.double.right"
        }]) ];

        if (options.length) components.unshift(interaction.components.selectMenu({
            id: 0,
            followUp: true,
            options: options,
            placeholder: `🔁\u2800{locale_main_selectTradeOffer}`,
            args: { path: "tradeOffer" }
        }))

        return {
            embeds: [ interaction.components.embed({
                author: { name: `${player.user.displayName} - {locale_main_tradeList}`, iconUrl: player.user.displayAvatarURL() },
                description: `{locale_main_tradeListText}\n\u2800`,
                fields: fields
            }) ],
            components: components
        }
    }
}); 