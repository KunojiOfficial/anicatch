import rarities from "../data/rarities.json";

export default class Rarity {
    data: typeof rarities[1];
    id: number;
    ascension?: number

    constructor(rarity: number, ascension?: number) {
        this.id = rarity;
        this.data = rarities[rarity] || rarities[1];
        this.ascension = ascension;
    }
    
    public get color() {
        return this.data.color;
    }

    public get label() {
        return `${this.getShortEmoji()} **${this.data.name}**`
    }

    getShortEmoji(ascended: boolean = false) {
        return `{emoji_r${this.id}${ascended ? "a" : ""}}`;
    }

    getLongEmoji() {
        let text = "";
        for (let i = 0; i < 6; i++) {
            if (this.id > i) text += this.getShortEmoji(i < this.ascension);
            else text += "{emoji_emptyStar}";
        }

        return text;
    }

    getSellPrice() {
        return this.data.sellPrice;
    }

}