import { User as DiscordUser } from "discord.js";
import { Config, Role, User } from "@prisma/client";
import { UserRole } from "../types";

export default class Player {
    data: User
    role?: Role
    config?: Config
    user: DiscordUser
    
    constructor(user: DiscordUser, data: User, role?: Role, config?: Config) {
        this.data = data;
        this.user = user;

        if (config) this.config = config;
        if (role) this.role = role;
    }

    getBalance() {
        return `**Balance:**\u2800{emoji_smallCoin} {number_${this.data.coins}}\u2800{emoji_smallGem} {number_${this.data.gems}}`
    }
    
    getEncounters() {
        return `**Encounters:**\u2800{number_${this.data.encounters}}`;
    }
}