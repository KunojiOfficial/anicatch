import { CardCatalog, CardInstance, Character, Item, Stat } from "@prisma/client";
import { AttachmentBuilder } from "discord.js";
import { createCanvas, loadImage, registerFont } from "canvas";

import { DiscordClient } from "../types";

import levels from "../data/levels.json";

const statKeys = ["vit", "def", "pow", "agi", "spi", "res"];

// registerFont("./src/assets/fonts/SpaceMono-Regular.ttf", { family: "SpaceMono" });

export default class Card {
    card: CardInstance
    parent?: CardCatalog
    character?: Character
    stats?: Stat
    ball?: Item
    
    client?: DiscordClient
    rarity?: any
    type?: any

    constructor(object: {card: CardInstance, parent?: CardCatalog, character?: Character, stats?: Stat, ball?: Item, client?: DiscordClient}) {
        this.card = object.card;
        if (object.parent) this.parent = object.parent;
        if (object.stats) this.stats = object.stats;
        if (object.character) this.character = object.character;
        if (object.ball) this.ball = object.ball;

        if (object.client) {
            this.client = object.client;
            this.rarity = object.client.data.rarities[object.card.rarity.toString() as keyof typeof object.client.data.rarities];
            if (object.parent) this.type = object.client.data.types[object.parent.type.toString() as keyof typeof object.client.data.types];
        }
    }

    getLevel(forceExp?: number) {
        const exp = forceExp || this.card.exp;
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
    
        return result as Stat;
    }

    getRarity() {
        if (!this.client) return;

        return this.rarity as typeof this.client.data.rarities[1];
    }

    getType() {
        if (!this.client || !this.parent) return;

        return this.type as typeof this.client.data.types.INFERNO;
    }

    getRequiredExp(forcedLevel?: number) {
        let level = forcedLevel ? forcedLevel : this.getLevel();
        let requiredExp = 0;

        let thisLevel = levels[(level).toString() as keyof typeof levels];
        let nextLevel = levels[(level+1).toString() as keyof typeof levels];

        if (nextLevel) requiredExp = nextLevel-thisLevel;

        return requiredExp;
    }

    getExpForExactLevelUps(levelUps: number) {
        const level = this.getLevel()+levelUps;
        
        return levels[level.toString() as keyof typeof levels];
    }

    getPercentage(forceLevel?: number, forceExp?: number) {
        let level = forceLevel ? forceLevel : this.getLevel();
        let requiredExp = 0;

        let thisLevel = levels[(level).toString() as keyof typeof levels];
        let nextLevel = levels[(level+1).toString() as keyof typeof levels];

        if (nextLevel) requiredExp = nextLevel-thisLevel;

        let percentage = 0;
        if (requiredExp == 0) percentage = 100;
        else percentage = (((forceExp ? forceExp : this.card.exp)-thisLevel)/requiredExp)*100;
        
        return isNaN(percentage) ? 0 : Math.floor(percentage);
    }

    getCurrentHealth() {
        if (this.stats?.hp === -1) return this.getMaxHealth();
        return this.stats?.hp;
    }

    getMaxHealth() {
        let stats: Stat = this.getStats() as Stat;
        return stats.vit * 100;
    }

    getHealthBar() {
        return this.getBar(this.getMaxHealth(), this.getCurrentHealth()!);
    }

    getExpBar() {
        let requiredExp = levels[(this.getLevel()+1).toString() as keyof typeof levels];
        let previousExp = levels[(this.getLevel()).toString() as keyof typeof levels];
        return this.getBar(requiredExp-previousExp, this.card.exp-previousExp, "exp");
    }

    getBar(max:number, current:number, variant:string="", length:number = 12) {
        let part = max/length;
        
        let bar = "";
        for (let i = 0; i < length; i++) {
            if (current > part*i) bar += "{emoji_line_1"+variant+"}";
            else bar += "{emoji_line_0}";
        }

        return bar;
    }

    async generateCanvas(noRarity: boolean = false) {
        if (!this.parent) return;

        const canvas = createCanvas(270, 340);
        const ctx = canvas.getContext('2d');

        const cardImage = await loadImage(`./src/assets/cards/${this.parent.id-1}.jpg`); 
        
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(0, 0, 215, 340, 20);
        ctx.clip();
        ctx.drawImage(cardImage, -5, -5, 225, 350);
        ctx.restore();

        if (!noRarity) {
            const starImage = await loadImage(`./src/assets/rarities/${this.card.rarity}.png`);
            for (let i = 0; i < this.card.rarity; i++) ctx.drawImage(starImage, 230, /*70+*/(i*40), 40, 40);
        }

        return canvas;
    }

    async generateImage(noRarity: boolean = false) {
        if (!this.parent) return;

        const canvas = await this.generateCanvas(noRarity);
        return new AttachmentBuilder(canvas!.toBuffer(), { name: "card.jpg" });
    }

    getId() {
        return this.client!.getId(this.card.cardId, this.card.print) as string;
    }

    getLabel() {
        return `${this.ball?.emoji} **${this.character?.name}** [Lv. ${this.getLevel()}]\n\`${this.getId().padEnd(7, " ")}\`${this.type.emoji}\n${this.rarity.emoji.full}`;
    }
}