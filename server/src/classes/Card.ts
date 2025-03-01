import { CardCatalog, CardInstance, Character, Item, Move } from "@prisma/client";
import { AttachmentBuilder } from "discord.js";
import { createCanvas, loadImage, registerFont } from "canvas";

import { calculateExpForLevel, calculateHp, calculateLevelFromExp } from "../mechanics/statsCalculator";

import rarities from "../data/rarities.json";
import types from "../data/types.json";
import { base10ToBase26 } from "src/helpers/utils";

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
    
    rarity?: any
    type?: any

    constructor(object: {card: CardInstance, parent?: CardCatalog, character?: Character, ball?: Item, moves?: Move[]}) {
        this.card = object.card;
        if (object.parent) this.parent = object.parent;
        if (object.character) this.character = object.character;
        if (object.ball) this.ball = object.ball;
        if (object.moves) this.moves = object.moves;

        this.rarity = rarities[this.card.rarity.toString() as keyof typeof rarities];
        this.type = types[this.parent?.type.toString() as keyof typeof types];
    }

    canLevel() : boolean {
        return this.getLevel() < this.rarity.maxLevel;
    }

    getLevel(forceExp?: number) {
        const exp = forceExp || this.card.exp;
        if (exp === 0) return 1;

        let maxLevel = this.rarity.maxLevel;
        let level = calculateLevelFromExp(exp);

        return Math.min(level, maxLevel);
    }

    getStats() : Stats {
        return { 
            hp: this.card.hp === -1 ? calculateHp(this.card.vit) : this.card.hp,
            vit: this.card.vit,
            def: this.card.def,
            pow: this.card.pow,
            agi: this.card.agi,
            spi: this.card.spi,
            res: this.card.res
        } as Stats;
    }

    getRarity() {
        return this.rarity as typeof rarities[1];
    }

    getType() {
        if (!this.parent) return;

        return this.type as typeof types.INFERNO;
    }

    getRequiredExp(forcedLevel?: number) {
        let level = forcedLevel ? forcedLevel : this.getLevel();
        let requiredExp = 0;

        let thisLevel = calculateExpForLevel(level);
        let nextLevel = calculateExpForLevel(level+1);

        if (nextLevel) requiredExp = nextLevel-thisLevel;

        return requiredExp;
    }

    getExpForExactLevelUps(levelUps: number) {
        const level = this.getLevel()+levelUps;
        return calculateExpForLevel(level);
    }

    getPercentage(forceLevel?: number, forceExp?: number) {
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

    getCurrentHealth() {
        if (this.card.hp === -1) return this.getMaxHealth();
        return this.card.hp;
    }

    getMaxHealth() {
        let stats: Stats = this.getStats();
        return calculateHp(stats.vit);
    }

    getHealthBar(length: number = 12) {
        return this.getBar(this.getMaxHealth(), this.getCurrentHealth()!, "hp", length);
    }

    getExpBar(length: number = 12) {
        let requiredExp = calculateExpForLevel(this.getLevel()+1);
        let previousExp = calculateExpForLevel(this.getLevel());
        return this.getBar(requiredExp-previousExp, this.card.exp-previousExp, "exp", length);
    }

    getBar(max:number, current:number, variant:string="hp", length:number = 12) {
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
        return `${base10ToBase26(this.card.cardId)}-${this.card.print}`;
    }

    getLabel() {
        return `${this.ball?.emoji} **${this.character?.name}** [Lv. ${this.getLevel()}]\n\`${this.getId().padEnd(7, " ")}\`${this.type.emoji}\n${this.rarity.emoji.full}`;
    }

    getStatPoints() {
        let expectedPoints = this.getLevel() * 6;
        let spentPoints = this.card.vit + this.card.def + this.card.pow + this.card.agi + this.card.spi + this.card.res;

        return Math.max(0, expectedPoints-spentPoints);
    }
}