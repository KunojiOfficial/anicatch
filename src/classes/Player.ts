import { User as DiscordUser } from "discord.js";
import { Config, User } from "@prisma/client";

export default class Player {
    data: User
    config: Config
    user: DiscordUser
    
    constructor(data: User, config: Config, user: DiscordUser) {
        this.data = data;
        this.config = config;
        this.user = user;
    }
}