import { CardCatalog, CardInstance, Character, Item, Move, PrismaClient } from "@prisma/client";
import { AttachmentBuilder } from "discord.js";
import { createCanvas, loadImage } from "canvas";

import { calculateExpForLevel, calculateHp, calculateLevelFromExp } from "../mechanics/statsCalculator.ts";
import { base10ToBase26 } from "../helpers/utils.ts";

import rarities from "../data/rarities.json";
import types from "../data/types.json";
import Rarity from "./Rarity.ts";

interface Stats {
    hp: number,
    vit: number,
    def: number,
    pow: number,
    agi: number,
    spi: number,
    res: number
}

export default class Card {
    card: CardInstance
    parent?: CardCatalog
    character?: Character
    moves?: Move[]
    ball?: Item
    
    rarity?: typeof rarities[1]
    rarityInstance: Rarity
    type?: typeof types.INFERNO

    constructor(object: {card: CardInstance, parent?: CardCatalog, character?: Character, ball?: Item, moves?: Move[]}) {
        this.card = object.card;
        if (object.parent) this.parent = object.parent;
        if (object.character) this.character = object.character;
        if (object.ball) this.ball = object.ball;
        if (object.moves) this.moves = object.moves;

        this.rarity = rarities[this.card.rarity.toString() as keyof typeof rarities];
        this.type = types[this.parent?.type.toString() as keyof typeof types];
        this.rarityInstance = new Rarity(this.card.rarity, this.card.ascension);
    }

    public get stats() : Stats {
        return { 
            hp: this.card.hp === -1 ? calculateHp(this.card.vit + (this.card.ascension*5)) : this.card.hp,
            vit: this.card.vit + (this.card.ascension*5),
            def: this.card.def + (this.card.ascension*5),
            pow: this.card.pow + (this.card.ascension*5),
            agi: this.card.agi + (this.card.ascension*5),
            spi: this.card.spi + (this.card.ascension*5),
            res: this.card.res + (this.card.ascension*5)
        } as Stats;
    }

    public get currentHealth(): number {
        if (this.card.hp === -1) return this.maxHealth;
        return this.card.hp;
    }

    public get maxHealth(): number {
        let stats: Stats = this.stats;
        return calculateHp(stats.vit);
    }

    public get label(): { short: string, long: string } {
        return {
            short: `${this.ball ? `${this.ball?.emoji} ` : ""}{emoji_${this.type.name.toLowerCase()}} ${this.rarityInstance.getShortEmoji()} \`${this.id.padEnd(7, " ")}\` **${this.character?.name}** [Lv. ${this.getLevel()}]`,
            long: `${this.ball?.emoji} **${this.character?.name}** [Lv. ${this.getLevel()}]\n\`${this.id.padEnd(7, " ")}\`{emoji_${this.type.name.toLowerCase()}}\n${this.rarityInstance.getLongEmoji()}`
        };
    }

    public get canLevel() : boolean {
        return this.level < this.rarity.maxLevel;
    }

    public get statPoints() : number {
        let expectedPoints = this.getLevel() * 6;
        let spentPoints = this.card.vit + this.card.def + this.card.pow + this.card.agi + this.card.spi + this.card.res;

        return Math.max(0, expectedPoints-spentPoints);
    }

    public get numericId() : number {
        return this.card.id;
    }

    public get name() : string {
        return this.character?.name;
    }

    public get id() : string {
        return `${base10ToBase26(this.card.cardId)}-${this.card.print}`;
    }
    
    public get level() : number {
        return this.getLevel();
    }

    public get canAscend() : boolean {
        return this.card.ascension < this.card.rarity && this.level == this.rarity.maxLevel;
    }

    public get canEvolve() : boolean {
        return this.card.ascension === this.card.rarity && this.level == this.rarity.maxLevel && this.rarity.evolvesInto !== null;
    }

    public getLevel(forceExp?: number) {
        const exp = forceExp || this.card.exp;
        if (exp === 0) return 1;

        let maxLevel = this.rarity.maxLevel;
        let level = calculateLevelFromExp(exp);

        return Math.min(level, maxLevel);
    }
    
    public getRequiredExp(forcedLevel?: number) {
        let level = forcedLevel ? forcedLevel : this.getLevel();
        let requiredExp = 0;

        let thisLevel = calculateExpForLevel(level);
        let nextLevel = calculateExpForLevel(level+1);

        if (nextLevel) requiredExp = nextLevel-thisLevel;

        return requiredExp;
    }

    public getExpForExactLevelUps(levelUps: number) {
        const level = this.getLevel()+levelUps;
        return calculateExpForLevel(level);
    }

    public getPercentage(forceLevel?: number, forceExp?: number) {
        let level = forceLevel ? forceLevel : this.getLevel();
        let requiredExp = 0;

        let thisLevel = calculateExpForLevel(level);
        let nextLevel = calculateExpForLevel(level+1);

        if (nextLevel) requiredExp = nextLevel-thisLevel;

        let percentage = 0;
        if (requiredExp == 0) percentage = 100;
        else percentage = (((forceExp ? forceExp : this.card.exp)-thisLevel)/requiredExp)*100;
        
        return isNaN(percentage) ? 0 : Math.floor(percentage);
    }

    /**
     * Ascend the card
     * @param db PrismaClient
     * @returns {boolean} true if ascension was successful, false otherwise
     */
    public async ascend(db: PrismaClient): Promise<boolean> {
        if (!this.parent) return false;
        if (!this.canAscend) return false;

        if (this.card.status !== "IDLE" && this.card.status !== "DEAD") throw 18;

        await db.$transaction(async tx => {
            const ascernsionCost = this.rarity.ascendCost;
            const ascensionItem = await tx.item.findFirst({
                where: { type: "FRAGMENT", properties: { path: ["type"], equals: this.type.name.toUpperCase() } }
            });

            if (!ascensionItem) return;
            
            const update = await tx.inventory.updateMany({
                where: { itemId: ascensionItem.id, userId: this.card.userId, count: { gte: ascernsionCost } },
                data: { count: { decrement: ascernsionCost } }
            });

            if (update.count <= 0) throw 76;

            await tx.cardInstance.update({
                where: { id: this.card.id },
                data: { ascension: { increment: 1 }, hp: -1, exp: 0, vit: 1, def: 1, pow: 1, agi: 1, spi: 1, res: 1 }
            });

        });
    }

    /**
     * Evolve the card (increase the rarity)
     * @param db PrismaClient
     */
    public async evolve(db: PrismaClient, sacrificeFilter: object): Promise<boolean> {
        if (!this.parent) return false;
        if (!this.canEvolve) return false;

        if (this.card.status !== "IDLE" && this.card.status !== "DEAD") throw 18;

        await db.$transaction(async tx => {
            const update = await tx.cardInstance.deleteMany({
                where: { ...sacrificeFilter, userId: this.card.userId, rarity: this.rarity.evolvesInto, status: { in: ["DEAD", "IDLE"] }, favorite: false }
            })
            console.log({ ...sacrificeFilter, userId: this.card.userId, rarity: this.rarity.evolvesInto, status: { in: ["DEAD", "IDLE"] }, favorite: false })

            if (update.count <= 0) throw 77;

            await tx.cardInstance.update({
                where: { id: this.card.id },
                data: { rarity: this.rarity.evolvesInto, ascension: 0, hp: -1, exp: 0, vit: 1, def: 1, pow: 1, agi: 1, spi: 1, res: 1 }
            });
        });
    }

    public async generateCanvas(noRarity: boolean = false, width: number = 270) {
        if (!this.parent) return;

        const height = Math.floor(width * 1.25925); // Adjusted height to maintain aspect ratio

        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');

        const cardImage = await loadImage(`./src/assets/cards/${this.parent.id-1}.jpg`); 
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(2, 2, width - 59, height - 4, 10); // Adjusted dimensions to match the outline
        ctx.clip();
        ctx.drawImage(cardImage, 2, 2, width - 59, height - 4); // Adjusted image dimensions and position to fit within the outline
        ctx.restore();

        // Draw rounded outline around the cardImage
        ctx.lineWidth = 4;
        ctx.strokeStyle = this.rarity?.color || "black";
        ctx.beginPath();
        ctx.roundRect(2, 2, width - 59, height - 4, 10); // Ensure the outline matches the clipped area
        ctx.stroke();

        if (!noRarity) {
            const starImage = await loadImage(`./src/assets/rarities/${this.card.rarity}.png`);
            const ascendedStarImage = this.card.ascension > 0 ? await loadImage(`./src/assets/rarities/${this.card.rarity}a.png`) : null;

            for (let i = 0; i < this.card.rarity; i++) ctx.drawImage(i < this.card.ascension ? ascendedStarImage : starImage, width - 40, 18 + (i * (40 * (width / 270))), 40 * (width / 270), 40 * (width / 270));
        }

        return canvas;
    }

    public async generateImage(noRarity: boolean = false, width: number = 270) {
        if (!this.parent) return;

        const canvas = await this.generateCanvas(noRarity, width);
        return new AttachmentBuilder(canvas!.toBuffer(), { name: "card.jpg" });
    }

    public getHealthBar(length: number = 12) {
        return this.getBar(this.maxHealth, this.currentHealth, "hp", length);
    }

    public getExpBar(length: number = 12) {
        let requiredExp = calculateExpForLevel(this.getLevel()+1);
        let previousExp = calculateExpForLevel(this.getLevel());
        return this.getBar(requiredExp-previousExp, this.card.exp-previousExp, "exp", length);
    }

    public getBar(max:number, current:number, variant:string="hp", length:number = 12) {
        let part = max/length;
        
        let bar = "";
        for (let i = 0; i < length; i++) {
            if (current > part*i) bar += "{emoji_line_1"+variant+"}";
            else bar += "{emoji_line_0}";
        }

        return bar;
    }
}