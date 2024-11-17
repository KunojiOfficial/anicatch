import { InteractionReplyOptions, User } from "discord.js";
import { DiscordInteraction } from "../types";
import Panel from "../classes/Panel";
import Card from "../classes/Card";
import Player from "../classes/Player";

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
        
        let text = "";
        const items = offer[side] as {type: "currencies" | "cards" | "items", value: number, count: number}[], itemsData: any = {}, options = [];
        for (const type of types) {
            if (type === "cards") itemsData[type] = await client.db.cardInstance.findMany({ where: { id: { in: items.filter(i => i.type === "cards").map(i => i.value) } }, include: { card: { include: { character: true } }, ball: true } });
            else if (type === "items") itemsData[type] = await client.db.item.findMany({ where: { id: { in: items.filter(i => i.type === "items").map(i => i.value) } } });
        
            let itemsOfType = items.filter(i => i.type === type);
            if (itemsOfType.length) text += `### {locale_main_${type}} (${itemsOfType.reduce((acc, curr) => acc + curr.count, 0)})\n`;
            for (const item of itemsOfType) {
                let data = type !== "currencies" ? itemsData[type].find((i: any) => i.id === item.value) : {};
                if (type === "cards") {
                    let card = new Card({ card: data, parent: data.card, character: data.card.character, ball: data.ball, client: client });
                    text += `${card.getLabel()}\n`;                    
                    options.push({ label: card.character!.name, hardEmoji: card.rarity.emoji.short, value: `${type}:${item.value}` });
                } else if (type === "items") {
                    text += `${data.emoji} **{locale_items_${data.name}_name}** x${item.count}\n`;
                    options.push({ label: `{locale_items_${data.name}_name} x${item.count}`, hardEmoji: data.emoji, value: `${type}:${item.value}` });
                } else if (type === "currencies") {
                    let currency = item.value === 1 ? "coins" : "gems";
                    text += `{emoji_${currency}} ${item.count}\n`;
                    options.push({ label: `${item.count}`, emoji: currency, value: `${type}:${item.value}` });
                }
            }
        }

        let playerData = player;
        if (side === "requested") playerData = new Player(user, offer.users[1]);

        let msgComponents = [ components.selectMenu({
            id: 0,
            options: [
                { label: "⬅️\u2800Edit offered items", value: "1:offered", default: side === "offered" },
                { label: "➡️\u2800Edit requested items", value: "1:requested", default: side === "requested" }
            ],
            args: { path: "tradeCreator" }
        }), components.selectMenu({
            placeholder: "➕\u2800Choose an item you wish to add...",
            options: types.map((t, i) => ({ label: `{locale_main_${t}}`, value: t, emoji: emojis[i] }))
        }) ]
        
        if (items.length) msgComponents.push(components.selectMenu({
            id: 69,
            placeholder: "➖\u2800Choose an item you wish to remove...",
            options: options
        }));
        
        if (text.length < 1) text = "\n*No items have been added...*\n\u2800";

        return {
            embeds: [ components.embed({
                author: { name: `Edit ${side} items - ${user.displayName}`, iconUrl: user.displayAvatarURL() },
                description: `${playerData.getBalance()}\n{locale_main_tradeCreatorDescription+${side}}\n${text}\u2800`,
                footer: { text: `Trading with ${recipient.displayName}`, iconUrl: recipient.displayAvatarURL() }
            }) ],
            components: [ ...msgComponents, components.buttons([{
                label: "Send",
                emoji: "wyes",
                style: "green"
            }, {
                label: "Cancel",
                emoji: "wno",
                style: "red"
            }])]
        }
    }
}); 