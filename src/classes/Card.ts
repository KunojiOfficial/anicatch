import { CardCatalog, CardInstance, Stat } from "@prisma/client";
import { DiscordClient } from "../types";

import levels from "../data/levels.json";
import { AttachmentBuilder } from "discord.js";

const statKeys = ["vit", "def", "pow", "agi", "spi", "res"];

export default class Card {
    card: CardInstance
    parent?: CardCatalog
    stats?: Stat
    
    client?: DiscordClient
    rarity?: any
    type?: any

    constructor(card: CardInstance, parent?: CardCatalog, stats?: Stat, client?: DiscordClient) {
        this.card = card;
        if (parent) this.parent = parent;
        if (stats) this.stats = stats;

        if (client) {
            this.client = client;
            this.rarity = client.data.rarities[card.rarity.toString() as keyof typeof client.data.rarities];
            if (parent) this.type = client.data.types[parent.type.toString() as keyof typeof client.data.types];
        }
    }

    getLevel() {
        const exp = this.card.exp;
        if (exp === 0) return 1;

        let maxLevel = this.rarity.maxLevel;
        if (exp >= levels[maxLevel.toString() as keyof typeof levels]) return maxLevel;

        const values = Object.values(levels);
        for (let i = 0; i < values.length; i++) {
            if (values[i] === exp) return i+1;
            else if (values[i] > exp) return i;
            else continue;
        }

        return maxLevel;
    }

    getStats() {
        if (!this.parent || !this.stats) return {};

        const rarity = this.rarity;
        const result: {vit: number, def: number, pow: number, agi: number, spi: number, res: number} = {vit:0,def:0,pow:0,agi:0,spi:0,res:0};
        
        for (const key of statKeys) {
            result[key as keyof typeof result] = Math.floor(
                (this.parent[key as keyof typeof this.parent] as number) * //base values from parent
                (1+((this.getLevel() - 1)/99)*5) * //level multiplier
                rarity.multipier * //rarity multiplier
                ((100+(this.stats[key as keyof typeof this.stats] as number))/100) //encounter multipliers
            );
        }
    
        return result;
    }

    getImage() {
        if (!this.parent) return;
        
        const filePath = `./src/assets/cards/${this.parent.id-1}.jpg`;
        const attachment = new AttachmentBuilder(filePath, { name: "card.jpg" });

        return attachment;
    }

    getRarity() {
        if (!this.client) return;

        return this.rarity as typeof this.client.data.rarities[1];
    }

    getType() {
        if (!this.client || !this.parent) return;

        return this.type as typeof this.client.data.types[1];
    }
}