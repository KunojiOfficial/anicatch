import { User as DiscordUser } from "discord.js";
import { Config, Role, User } from "@prisma/client";
import { UserRole } from "../types";
import Client from "./Client";

export default class Player {
    data: User
    role?: Role
    config?: Config
    user: DiscordUser
    
    constructor(user: DiscordUser, data?: User, role?: Role, config?: Config) {
        this.user = user;
        
        if (data) this.data = data;
        if (config) this.config = config;
        if (role) this.role = role;
    }

    public getBalance(): string {
        return `**{locale_main_balance}:**\u2800{emoji_smallCoin} {number_${this.data.coins}}\u2800{emoji_smallGem} {number_${this.data.gems}}`
    }
    
    public getEncounters(): string {
        return `**{locale_main_encounterss}:**\u2800{number_${this.data.encounters}}`;
    }

    public async refreshEncounters(client: Client) {
        if (this.data.encounters >= this.role.maxEncounters) return;
        const now = new Date();
        const lastReset = this.data.lastReset;
        
        const secondsSinceReset = (now.getTime() - lastReset.getTime()) / 1000;
        const encountersToAdd = Math.floor(secondsSinceReset / this.role.rechargeTime);
        
        if (encountersToAdd > 0) {
            const newEncounters = Math.min(this.data.encounters + encountersToAdd, this.role.maxEncounters);
            
            let data: any = { 
                encounters: newEncounters, 
                lastReset: new Date()
            };
    
            if (newEncounters < this.role.maxEncounters) {
                const nextNotify = new Date(now.getTime() + (this.role.rechargeTime * (this.role.maxEncounters-newEncounters) * 1000));
                data.nextNotify = nextNotify;
            }
    
            this.data = await client.db.user.update({ 
                where: { id: this.data.id }, 
                data: data, 
                include: { config: true, role: true } 
            });
        }
    
        if (!this.data.nextNotify && this.data.encounters < this.role.maxEncounters) {
            const nextNotify = new Date(now.getTime() + (this.role.rechargeTime * (this.role.maxEncounters-this.data.encounters) * 1000));
            this.data = await client.db.user.update({ where: { id: this.data.id }, data: { nextNotify: nextNotify } });
        }
    }

    public async create(user: DiscordUser, client: Client, locale: string) {
        let data = await client.db.user.upsert({
            where: { discordId: user.id },
            update: { },
            create: { 
                discordId: user.id, 
                username: user.username,
                config: { create: { locale: locale } },
                stats: { create: {} },
                items: { create: [{ itemId: 1, count: 15 }, { itemId: 2, count: 1 }, { itemId: 3, count: 1 }, { itemId: 4, count: 1 }] }
            },
            include: { config: true, role: true }
        });
    
        this.data = data;
        this.config = data.config;
        this.role = data.role;
    }
}