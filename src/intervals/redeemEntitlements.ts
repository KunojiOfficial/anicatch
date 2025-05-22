import { PrismaClient } from "@prisma/client";
import { ClusterManager } from "discord-hybrid-sharding";
import { APIEntitlement, EntitlementType, REST, Routes } from "discord.js";

import { getBenefits, parseColor } from "../helpers/utils.ts";

import entitlementsData from "../config/entitlements.json";
import config from "../config/main.json";
import Formatter from "../classes/Formatter.ts";

async function send(manager: ClusterManager, receiver: string, message: any) {
    for (const [_, cluster] of manager.clusters) {
        const answer = await cluster.request({ action: 'directMessage', user: receiver, content: message });
        if ((answer as any).found) break;
    }
}

export default async function redeemEntitlements(db: PrismaClient, manager: ClusterManager, formatter: Formatter) {
    const playerRole = await db.role.findFirst({ where: { name: "Player" }, select: { id: true } });
    if (!playerRole) throw "Player role not found";

    const premiumRoles = await db.role.findMany({ where: { skuId: { in: entitlementsData.filter(e => e.type === "sub").map(e => e.id) } } })

    setInterval(async () => {
        const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
        const route = Routes.entitlements(process.env.DISCORD_CLIENT_ID);
    
        let entitlements: APIEntitlement[] = [];
        let fetched: APIEntitlement[] = [];

        let options = { exclude_ended: true, skuIds: entitlementsData.filter(e => e.type === "sub").map(s => s.id) };

        fetched = await rest.get(route, { body: options }) as APIEntitlement[]; 
        entitlements = [...fetched];

        while (fetched.length === 100) {
            fetched = await rest.get(route, { body: { ...options, after: fetched[fetched.length - 1].id } }) as APIEntitlement[];
            entitlements = [...entitlements, ...fetched];
        }
        
        if (!entitlements?.length) return;
        
        const subs = entitlementsData.filter(e => e.type === "sub").map(s => s.id);
        console.log(entitlements);
        const subscriptions = entitlements.filter(e => subs.includes(e.sku_id) && (new Date(e.ends_at) > new Date() || e.ends_at == null));
        const subbedUsers = await db.user.findMany({ where: { role: { skuId: { in: entitlementsData.filter(e => e.type === "sub").map(s => s.id) } } }, include: { role: true, config: true } });
    
        //manage users who are subscribed
        for (const user of subbedUsers) {
            const subscription = subscriptions.find(e => e.user_id === user.discordId);
            
            if (!subscription) {
                //remove subscription
                await db.user.update({ where: { id: user.id }, data: { roleId: playerRole.id } });
                await send(manager, user.discordId, {
                    embeds: [ {
                        title: formatter.f(`{locale_main_subscriptionEnd}`, user.config.locale),
                        description: formatter.f(`{locale_main_subscriptionEndText}`, user.config.locale),
                        color: parseColor(config.defaults.embed.color)
                    } ]
                });
                continue; 
            }
    
            if (subscription.sku_id === user.role.skuId) {
                //subscription already exists
                continue;
            }
    
            //update subscription (downgrade or upgrade)
            const data = entitlementsData.find(e => e.id === subscription.sku_id);
            if (!data) continue; //no data

            const role = premiumRoles.find(r => r.skuId === subscription.sku_id);
            if (!role) continue; //no role

            const benefits = await getBenefits(role, db);

            await db.user.update({ where: { id: user.id }, data: { roleId: data.roleId } });
            await send(manager, user.discordId, {
                embeds: [ {
                    title: formatter.f(`{locale_main_subscriptionChange}`, user.config.locale),
                    description: formatter.f(`{locale_main_subscriptionChangeText}\n### {locale_main_benefits}:\n${benefits.text}`, user.config.locale, {
                        name: [role.name],
                        ...benefits.variables
                    }),
                    color: parseColor(config.defaults.embed.color)
                } ]
            });
        }
    
        //manage users who are not subscribed
        for (const subscription of subscriptions.filter(e => !subbedUsers.map(u => u.discordId).includes(e.user_id))) {
            //create subscription
            const user = await db.user.findFirst({ where: { discordId: subscription.user_id }, include: { config: true } });
            if (!user) continue; //no user

            const data = entitlementsData.find(e => e.id === subscription.sku_id);
            if (!data) continue; //no data

            const role = premiumRoles.find(r => r.skuId === subscription.sku_id);
            if (!role) continue; //no role

            const benefits = await getBenefits(role, db);

            await db.user.update({ where: { id: user.id }, data: { roleId: data.roleId } });
            await send(manager, user.discordId, {
                embeds: [ {
                    title: formatter.f(`{locale_main_thanksForPurchase} ❤️`, user.config.locale),
                    description: formatter.f(`{locale_main_subscriptionNew}\n### {locale_main_benefits}:\n${benefits.text}`, user.config.locale, {
                        name: [role.name],
                        ...benefits.variables
                    }),
                    color: parseColor(config.defaults.embed.color)
                } ]
            });
        }
    }, 60000 );
}