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
}