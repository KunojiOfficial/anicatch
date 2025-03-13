import { InteractionReplyOptions } from "discord.js";
import { DiscordInteraction } from "../types";
import Panel from "../classes/Panel";
import Trade from "../classes/Trade";

export default new Panel({
    name: "tradeOffer",
    async execute(interaction: DiscordInteraction, offerId: number | string, side: "offered" | "requested" = "offered"): Promise<InteractionReplyOptions> {
        const { client, player } = interaction;
        if (typeof offerId === "string") offerId = parseInt(offerId);

        const offer = await client.db.trade.findFirst({ where: { id: offerId, OR: [{ offererId: player.data.id }, { recipientId: player.data.id }] }, include: { users: true } });
        if (!offer) throw 42;

        const trade = new Trade(interaction, offer, offer.users);
        let [text, _] = await trade.getItems(side);

        let description = `${player.getBalance()}\n\n**Created:** ${client.unixDate(offer.createdAt, "long")}`;
        if (offer.updatedAt) description += `\n**Finalized:** ${client.unixDate(offer.updatedAt, "long")}`;

        description += `\n**Status:** {emoji_${offer.status}} {locale_main_${offer.status}}`;

        const recipient = offer.users.find(u=> u.id === offer.recipientId), offerer = offer.users.find(u=> u.id === offer.offererId); 

        if (text.length < 1) text = "\n*No items...*\n";

        const components = [ interaction.components.selectMenu({
            id: 0,
            options: [
                { label: `⬅️\u2800${offerer?.username}'s offer`, value: "2:offered", default: side === "offered" },
                { label: `➡️\u2800${recipient?.username}'s offer`, value: "2:requested", default: side === "requested" }
            ],
            args: { path: "tradeOffer", offerId: offerId }
        }) ];

        if (offer.status === "ACTIVE" && offer.recipientId === player.data.id) components.push(interaction.components.buttons([{
            id: "16",
            label: "Accept",
            emoji: "wyes",
            style: "green",
            args: { result: "accept", id: offer.id },
            cooldown: { id: "finalize", time: 5 }
        }, {
            id: "16",
            label: "Reject",
            emoji: "wno",
            style: "red",
            args: { result: "reject", id: offer.id },
            cooldown: { id: "finalize", time: 5 }
        }])); 
        else if (offer.status === "ACTIVE" && offer.offererId === player.data.id) components.push(interaction.components.buttons([{
            id: "16",
            label: "Cancel",
            emoji: "wno",
            style: "red",
            args: { result: "reject", id: offer.id },
            cooldown: { id: "finalize", time: 5 }
        }]));

        return {
            embeds: [ interaction.components.embed({
                author: { name: `${player.user.displayName} - Trade #${offer.id}`, iconUrl: player.user.displayAvatarURL() },
                description: description + "\n" + text + "\u2800".repeat(40)
            }) ],
            components: components
        };
    }
}); 