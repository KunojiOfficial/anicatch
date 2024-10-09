import { User as DiscordUser } from "discord.js";
import { Config } from "@prisma/client";
import { UserRole } from "../types";

export default class Player {
    data: UserRole
    config: Config
    user: DiscordUser
    
    constructor(data: UserRole, config: Config, user: DiscordUser) {
        this.data = data;
        this.config = config;
        this.user = user;
    }

    getBalance() {
        return `**Balance:**\u2800{emoji_smallCoin} {number_${this.data.coins}}\u2800{emoji_smallGem} {number_${this.data.gems}}`
    }
    
    getEncounters() {
        return `**Encounters:**\u2800{number_${this.data.encounters}}`;
    }
}