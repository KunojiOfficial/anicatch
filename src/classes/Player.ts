import { User as DiscordUser } from "discord.js";
import { Config, PrismaClient, Role, Suspension, User } from "@prisma/client";
import Client from "./Client.ts";
import Referral from "./Referral.ts";


function generateRandomCode(length: number = 10): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';

    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * chars.length);
        result += chars[randomIndex];
    }

    return result;
}

export default class Player {
    data: User
    role?: Role
    config?: Config
    suspensions: Suspension[]
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
        return `**{locale_main_encounterss}:**\u2800{emoji_encounters} {number_${this.data.encounters}}`;
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
                lastDaily: new Date(new Date().getTime() - 2 * 24 * 60 * 60 * 1000),
                version: client.version,
                config: { create: { locale: locale, votes: false, encounters: false } },
                stats: { create: {} },
                items: { create: [{ itemId: 1, count: 15 }, { itemId: 2, count: 1 }, { itemId: 3, count: 1 }, { itemId: 4, count: 1 }] }
            },
            include: { config: true, role: true, suspensions: { where: { OR: [{expiresAt: { gt: new Date() }}, {expiresAt: null}] } } }
        });
    
        this.data = data;
        this.config = data.config;
        this.role = data.role;
        this.suspensions = data.suspensions;
    }

    public async generateReferralCode(client: Client): Promise<string> {
        let isUnique = false;
        let code = "";

        while (!isUnique) {
            code = generateRandomCode();
            
            const existing = await client.db.user.findFirst({ where: { referralCode: code } });
            if (!existing) isUnique = true;
        }

        await client.db.user.update({ where: { id: this.data.id }, data: { referralCode: code } });
        return code;
    }

    public async setReferralCode(db: PrismaClient, code: string): Promise<boolean> {
        code = code.toUpperCase();

        if (this.data.referredBy) return false;
        if (this.data.referralCode === code) return false;

        //check if account is younger than 24 hours
        const now = new Date();
        const createdAt = new Date(this.data.createdAt);
        const diff = Math.abs(now.getTime() - createdAt.getTime());
        const diffHours = Math.ceil(diff / (1000 * 60 * 60));
        if (diffHours > 24) return false;

        const existing = await db.user.findFirst({ where: { referralCode: code } });
        if (!existing) return false;

        await db.user.update({ where: { id: this.data.id }, data: {referredBy: existing.id} });

        return true;
    }

    public async sendReferralRewards(db: PrismaClient) {
        if (this.data.refClaimed) return;

        const referredBy = this.data.referredBy;
        if (!referredBy) return;

        const referral = new Referral();
        const rewards = referral.rewards;
        let updateMe = {}, updateThem = {};

        for (const reward of rewards) {
            if (!reward.update) continue;
            if (reward.who === "both") {
                updateMe = {...updateMe, ...reward.update};
                updateThem = {...updateThem, ...reward.update};
            } else if (reward.who === "referrer") {
                updateThem = {...updateThem, ...reward.update};
            } else if (reward.who === "referral") {
                updateMe = {...updateMe, ...reward.update};
            }
        }

        await db.$transaction(async tx => {
            await tx.user.update({ where: { id: this.data.id }, data: {...updateMe, refClaimed: true} });
            await tx.user.update({ where: { id: referredBy }, data: updateThem });
        });
    }

    public async getReferrals(db: PrismaClient) {
        const referrals = await db.user.findMany({ where: { referredBy: this.data.id }, include: { stats: true } });
        return {referrals, finished: referrals.filter(r => r.stats.captured >= 5)};
    }

    public async getReferredBy(db: PrismaClient) {
        if (!this.data.referredBy) return null;
        const referredBy = await db.user.findFirst({ where: { id: this.data.referredBy } });
        if (!referredBy) return null;

        return referredBy.username;
    }
}