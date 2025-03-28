import { InteractionReplyOptions } from "discord.js";

import { DiscordInteraction } from "../types.ts";
import Panel from "../classes/Panel.ts";
import Trade from "../classes/Trade.ts";

export default new Panel({
    name: "tradeOffer",
    async execute(interaction: DiscordInteraction, offerId: number | string, side: "offered" | "requested" = "offered"): Promise<InteractionReplyOptions> {
        const { client, player } = interaction;
        if (typeof offerId === "string") offerId = parseInt(offerId);

        const offer = await client.db.trade.findFirst({ where: { id: offerId, OR: [{ offererId: player.data.id }, { recipientId: player.data.id }] }, include: { users: true } });
        if (!offer) throw 42;

        const trade = new Trade(interaction, offer, offer.users);
        let [text, _] = await trade.getItems(side);

        let description = `${player.getBalance()}\n\n**{locale_main_created}:** ${client.unixDate(offer.createdAt, "long")}`;
        if (offer.updatedAt) description += `\n**{locale_main_finalized}:** ${client.unixDate(offer.updatedAt, "long")}`;

        description += `\n**{locale_main_status}:** {emoji_${offer.status}} {locale_main_${offer.status}}`;

        const recipient = offer.users.find(u=> u.id === offer.recipientId), offerer = offer.users.find(u=> u.id === offer.offererId); 

        if (text.length < 1) text = "\n*{locale_main_noItemsShort}*\n";

        const components = [ interaction.components.selectMenu({
            id: 0,
            options: [
                { label: `⬅️\u2800{locale_main_usersOffer}`, value: "2:offered", default: side === "offered" },
                { label: `➡️\u2800{locale_main_usersOffer}`, value: "2:requested", default: side === "requested" }
            ],
            args: { path: "tradeOffer", offerId: offerId }
        }, {
            user: [offerer?.username, recipient?.username]
        }) ];

        if (offer.status === "ACTIVE" && offer.recipientId === player.data.id) components.push(interaction.components.buttons([{
            id: "16",
            label: "{locale_main_accept}",
            emoji: "wyes",
            style: "green",
            args: { result: "accept", id: offer.id },
            cooldown: { id: "finalize", time: 5 }
        }, {
            id: "16",
            label: "{locale_main_reject}",
            emoji: "wno",
            style: "red",
            args: { result: "reject", id: offer.id },
            cooldown: { id: "finalize", time: 5 }
        }])); 
        else if (offer.status === "ACTIVE" && offer.offererId === player.data.id) components.push(interaction.components.buttons([{
            id: "16",
            label: "{locale_main_cancel}",
            emoji: "wno",
            style: "red",
            args: { result: "reject", id: offer.id },
            cooldown: { id: "finalize", time: 5 }
        }]));

        return {
            embeds: [ interaction.components.embed({
                author: { name: `${player.user.displayName} - {locale_main_tradeOffer} #${offer.id}`, iconUrl: player.user.displayAvatarURL() },
                description: description + "\n" + text + "\u2800".repeat(40)
            }) ],
            components: components
        };
    }
}); 