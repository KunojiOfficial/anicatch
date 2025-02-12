import { InteractionReplyOptions, User } from "discord.js";
import { DiscordInteraction } from "../types";
import Panel from "../classes/Panel";
import Card from "../classes/Card";
import Player from "../classes/Player";
import Trade from "../classes/Trade";

const types = ["currencies", "cards", "items"], emojis = ["smallCoin", "cards", "donut"];

export default new Panel({
    name: "tradeCreator",
    async execute(interaction: DiscordInteraction, side: "offered" | "requested" = "offered", recipient?: User): Promise<InteractionReplyOptions> {
        const { user, client, player, components } = interaction;

        let offer;

        //initiate a new offer
        if (recipient) {
            if (recipient.id === user.id) throw 41;
            
            const offererData = await client.db.user.findFirst({ where: { id: player.data.id }, include: { trades: { where: { status: { in: ["ACTIVE", "CREATING"] } } } } });
            if (offererData && offererData.trades.length >= 5) throw 39; // you have too many offers
            if (offererData?.trades.find(t => t.status === "CREATING")) {
                const msg = await this.execute!(interaction);
                return {
                    ...msg,
                    content: "You are already in process of creating a trade offer. Redirecting to that offer instead.",
                };
            }

            const recipientData = await client.db.user.findFirst({ where: { discordId: recipient.id }, include: { trades: { where: { status: { in: ["ACTIVE", "CREATING"] } } } } });
            if (!recipientData) throw 7; //no user found
            if (recipientData.trades.length >= 5) throw 38; //recipient too many offers

            offer = await client.db.trade.create({ data: { 
                offererId: player.data.id,
                recipientId: recipientData.id,
                users: { connect: [{ id: player.data.id }, { id: recipientData.id }] }
            }, include: { users: true } });
        } else { //get active offer
            offer = await client.db.trade.findFirst({ where: { offererId: player.data.id, status: "CREATING" }, include: { users: true } });
        }
        
        if (!offer) throw 40;
        if (!recipient) recipient = await client.users.fetch(offer.users.find(i => i.id === offer.recipientId)!.discordId);
        
        const trade = new Trade(interaction, offer, offer.users);
        let [text, options] = await trade.getItems(side);
        let items = offer[side];

        let playerData = player;
        if (side === "requested") playerData = new Player(recipient,  offer.users.find(i => i.id === offer.recipientId)!);

        let msgComponents = [ components.selectMenu({
            id: 0,
            options: [
                { label: "⬅️\u2800Edit offered items", value: "1:offered", default: side === "offered" },
                { label: "➡️\u2800Edit requested items", value: "1:requested", default: side === "requested" }
            ],
            args: { path: "tradeCreator" }
        }), components.selectMenu({
            id: 3,
            placeholder: "➕\u2800Choose an item you wish to add...",
            options: types.map((t, i) => ({ label: `{locale_main_${t}}`, value: t, emoji: emojis[i] })),
            args: { side: side }
        }) ]
        
        if (items.length) msgComponents.push(components.selectMenu({
            id: 4,
            placeholder: "➖\u2800Choose an item you wish to remove...",
            options: options as any,
            args: { side: side }
        }));
        
        if (text.length < 1) text = "\n*No items have been added...*\n\u2800";

        return {
            embeds: [ components.embed({
                author: { name: `Edit ${side} items - ${user.displayName}`, iconUrl: user.displayAvatarURL() },
                description: `**${playerData.user.displayName}'s** ${playerData.getBalance()}\n{locale_main_tradeCreatorDescription+${side}}\n${text}\u2800`,
                footer: { text: `Trading with ${recipient.displayName}`, iconUrl: recipient.displayAvatarURL() }
            }) ],
            components: [ ...msgComponents, components.buttons([{
                id: "15",
                label: "Send",
                emoji: "wyes",
                style: "green",
                cooldown: { id: "tradeSend", time: 10 }
            }, {
                id: "14",
                label: "Cancel",
                emoji: "wno",
                style: "red"
            }, {
                id: "0F",
                label: "Item IDs",
                emoji: "code",
                args: { path: "itemList" }
            }])]
        }
    }
}); 