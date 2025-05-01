import rarities from "../data/rarities.json";

export default class Rarity {
    data: typeof rarities[1];
    id: number;

    constructor(rarity: number) {
        this.id = rarity;
        this.data = rarities[rarity] || rarities[1];
    }

    getShortEmoji() {
        return `{emoji_r${this.id}}`;
    }

    getLongEmoji() {
        let text = "";
        for (let i = 0; i < 6; i++) {
            if (this.id > i) text += this.getShortEmoji();
            else text += "{emoji_emptyStar}";
        }

        return text;
    }

    getSellPrice() {
        return this.data.sellPrice;
    }

    public get color() {
        return this.data.color;
    }
}