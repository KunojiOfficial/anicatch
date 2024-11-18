import { Trade as TradeDB, User } from "@prisma/client";
import { DiscordInteraction, TradeIncluded } from "../types";
import Card from "./Card";

type ItemType = "currencies" | "cards" | "items";
type Side = "offered" | "requested";
interface Item { type: ItemType, count: number, value: number }

const types = ["currencies", "cards", "items"], emojis = ["smallCoin", "cards", "donut"];

export default class Trade {
    interaction: DiscordInteraction
    offer: TradeDB
    users?: User[]

    constructor(interaction: DiscordInteraction, offer: TradeDB, users?: User[]) {
        this.interaction = interaction;
        this.offer = offer;

        if (users) this.users = users;
    }

    /**
     * Adds a new Item into the trade
     * @param side the side to add
     * @param item the item to add
     */
    async add(side: Side, item: { type: ItemType, count: number, value: number|{cardId: number, print:number} }) {
        if (!this.users) return;

        const { client, player } = this.interaction;
        const offer = this.offer;
    
        const recipient = this.users.find(u => u.id === offer.recipientId);
        if (!recipient) throw 3;
    
        const itemOwner = side === "offered" ? player.data : recipient;
    
        const items = offer[side] as any as Item[];
        const { type, value, count } = item;
    
        const itemCount = items.filter(i => i.type === type).length;
        if (itemCount >= 4) throw 45;
    
        if (type === "currencies") {
            if (value === 1 && itemOwner.coins < count) throw 43;
            else if (value === 2 && itemOwner.gems < count) throw 44;
    
            let index = items.findIndex((r: any) => r.type === type && r.value === value);
            
            if (index !== -1) items[index].count = count;
            else items.push(item as Item);
            
            let update: any = {}; update[side] = items as any;
            await client.db.trade.update({ where: { id: offer.id }, data: update });
        } else if (type === "cards") {
            const card = await client.db.cardInstance.findFirst({ where: { userId: itemOwner.id, ...(value as any) } });
            if (!card) throw 5; if (card.favorite) throw 46; if (card.status === "TRADE") throw 47; if (card.team) throw 48;
            if (items.find(i => i.type === "cards" && i.value === card.id)) throw 47;
    
            let update: any = {}; update[side] = { push: { type: "cards", count: 1, value: card.id } } as any;
            await client.db.trade.update({ where: { id: offer.id }, data: update });
        } else {
            const itemData = await client.db.inventory.findFirst({ where: { userId: itemOwner.id, itemId: value as number } });
            if (!itemData) throw 49; if (itemData.count < count) throw 50;
    
            let index = items.findIndex((r: any) => r.type === type && r.value === value);
            if (index !== -1) items[index].count = count;
            else items.push(item as Item);
    
            let update: any = {}; update[side] = items as any;
            await client.db.trade.update({ where: { id: offer.id }, data: update });
        }
    }

    /**
     * Removes an item from the trade offer
     * @param side the side to remove from
     * @param type the item type to remove
     * @param value the item value to remove
     */
    async remove(side: Side, type: ItemType, value: number) {
        const offer = this.offer;
        const items = offer[side];
        const index = items.findIndex((i: any) => i.type == type && i.value == value );
        if (index === -1) throw 42;

        items.splice(index, 1);

        let update: any = {}; update[side] = items as any;
        await this.interaction.client.db.trade.update({ where: { id: offer.id }, data: update });
    }

    /**
     * Cancels sending the trade offer
     */
    async cancel() {
        if (this.offer.status !== "CREATING") return;
        await this.interaction.client.db.trade.delete({ where: { id: this.offer.id } });
    }

    /**
     * Verifies and sends the trade offer
     */
    async send() {
        if (!this.users) return;

        const { client } = this.interaction;

        const recipient = this.users.find(u => u.id === this.offer.recipientId), offerer = this.users.find(u => u.id === this.offer.offererId);
        if (!recipient || !offerer) return;

        await client.db.$transaction(async tx => {
            for (const side of ["offered", "requested"] as Side[]) {
                const owner = side === "offered" ? offerer : recipient;
                const items = this.offer[side] as any as Item[];
    
                for (const item of items) {
                    //check availability of every item
                    let found: any = false;
                    if (item.type === "cards") found = await tx.cardInstance.findFirst({ where: { userId: owner.id, id: item.value, favorite: false, team: 0, status: { in: ["DEAD","IDLE"] }  } });
                    else if (item.type === "items") found = await tx.inventory.findFirst({ where: { itemId: item.value, userId: owner.id, count: { gte: item.count } } });
                    else {
                        if (item.value === 1) found = owner.coins >= item.count;
                        else found = owner.gems >= item.count;
                    }
    
                    if (!found) { //something unavailable, cancel the trade
                        await this.cancel();
                        throw 51;
                    }
    
                    //reserve items (only reserve currencies and items from the offerer)
                    if (item.type === "cards") await tx.cardInstance.update({ where: { userId: owner.id, id: item.value, favorite: false, team: 0, status: { in: ["DEAD","IDLE"] }  }, data: { status: "TRADE" } })
                    else if (item.type === "items" && side === "offered") await tx.inventory.update({ where: { itemId_userId: { itemId: item.value, userId: owner.id }, count: { gte: item.count } }, data: { count: { decrement: item.count } } });
                    else if (item.type === "currencies" && side === "offered") {
                        let update: any = {};
                        if (item.value === 1) update = { coins: { decrement: item.count } };
                        else update = { gems: { decrement: item.count } };

                        await tx.user.update({ where: { id: owner.id }, data: update });
                    }
                }

                await tx.trade.update({ where: { id: this.offer.id }, data: { status: "ACTIVE" } });
            }
        });
    }

    /**
     * Displays the offered or requested items in a nice way
     * @param side side of the items to display
     */
    async getItems(side: Side) {
        const { client } = this.interaction;

        let text = "";
        const items = this.offer[side] as any as Item[], itemsData: any = {}, options = [];
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

        return [text, options];
    }
}