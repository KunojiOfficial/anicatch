import { createServer } from 'http';
import { BaseMessage, ClusterManager } from 'discord-hybrid-sharding';
import express from 'express';
import bodyParser from 'body-parser';
import path from 'path';

import { base26ToBase10 } from '../helpers/utils.ts';
import Vote from '../classes/Vote.ts';

import { PrismaClient } from '@prisma/client';
import Formatter from '../classes/Formatter.ts';

import copyEmojis from '../helpers/copyEmojis.ts';
import setupEmojis from '../helpers/setupEmojis.ts';

import entitlements from "../config/entitlements.json";

const app = express();
const server = createServer(app);

export default function startServer(manager: ClusterManager, db: PrismaClient, formatter: Formatter) {
    app.set('view engine', 'ejs');
    app.set('views', path.join(process.cwd(), 'src/web/views'))
    
    app.set('trust proxy', 1);
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));
    
    app.get("/admin", (_, res) => {
        res.render('admin');
    });
    
    app.post("/admin", async (req, res) => {
        if (req.body.password !== process.env.ADMIN_PASSWORD) return;
        try {
            switch (req.body.action) {
                case "reload":
                    manager.broadcast(new BaseMessage({action: "deploy"}))
                    break;
                case "revive":
                    await db.cardInstance.updateMany({ where: { team: { gt: 0 }, userId: parseInt(req.body.id) }, data: { hp: -1, status: "IDLE" } });
                    break;
                case "translate":
                    res.send(`THE ID IS ${base26ToBase10(req.body.id.toUpperCase())}`);
                    return;
                    break;
                case "copy":
                    try {
                        await copyEmojis();
                    } catch (e) {
                        console.error(e);
                    }
                    break;
                case "setup":
                    try {
                        console.log("Setting up emojis...");
                        await setupEmojis();
                        console.log("Emojis setup complete.");
                    } catch (e) {
                        console.error(e);
                    }
                    break;
            }
        } catch (e) {
            console.error(e);
        }
    
        res.redirect("/admin");
    });
    
    app.post("/vote", async (req, res) => {
        if (req.headers.authorization !== process.env.VOTE_SECRET && req.body.password !== process.env.ADMIN_PASSWORD) return res.status(401).send("Unauthorized");
        
        try {
            // const requestingUrl = new URL(req.headers.referer || req.headers.origin).hostname;
            const id = req.body.user;
    
            await new Vote(id, "top.gg", db, manager, formatter).process();
            
            res.status(200).send("Vote processed");
        } catch (e) {
            console.error(e)
            res.status(500).send("Error processing vote");
        }
    });

    app.post("/store", async (req, res) => {
        if (req.headers.authorization !== process.env.STORE_SECRET) return res.status(401).send("Unauthorized");
        
        try {
            const skuId = req.body.id;
            const discordId = req.body.discordId;
    
            const user = await db.user.findUnique({ where: { discordId }, include: { config: true } });
            if (!user) return res.status(404).send("User not found");
    
            const entitlement = entitlements.find(e => e.id === skuId && e.type === "consumable");
            if (!entitlement) return res.status(404).send("Entitlement not found");
    
            await db.$transaction(async tx => {
                let update = {};
                for (const reward of entitlement.rewards) {
                    update[reward.type] = { increment: reward.amount };
                }
        
                if (user.referredBy) await tx.user.update({ where: { id: user.referredBy }, data: { gems: { increment: Math.round((entitlement.rewards.find(d => d.type === "gems")?.amount || 0) * 0.1) || 0 } } });
                await tx.user.updateMany({ where: { id: user.id }, data: update });
                await tx.log.create({ data: { userId: user.id, action: "consumable-purchase", description: `bought ${user.id}` } });
            });
    
            res.status(200).send("Entitlement processed");
        
            let rewardsInfo = "";
        
            for (const reward of entitlement.rewards) {
                rewardsInfo += `* {emoji_${reward.type}} **{number_${reward.amount}}**\n`;
            }
    
            for (const [_, cluster] of manager.clusters) {
                const answer = await cluster.request({ action: 'directMessage', user: user.discordId, content: {
                    embeds: [{
                        description: formatter.f(`### {locale_main_thanksForPurchase} ❤️\n{locale_main_successfullyAcquired}\n${rewardsInfo}\n{locale_main_hopeYouEnjoy}\n\n-# {locale_main_purchaseHelp}`, user.config.locale),
                    }]
                } });
                if ((answer as any).found) break;
            }
        } catch (e) {
            console.error(e)
            res.status(500).send("Error processing store request");
        }
    });

    app.get("/roles", async (req, res) => {
        if (req.headers.authorization !== process.env.VOTE_SECRET) return res.status(401).send("Unauthorized");

        try {
            const roles = await db.user.findMany({ where: { roleId: { gt: 1 } }, select: { discordId: true, roleId: true } });;
            res.status(200).json(roles);
        } catch (e) {
            console.error(e)
            res.status(500).send("Error processing roles");
        }
    });

    app.post("/roles", async (req, res) => {
        if (req.headers.authorization !== process.env.VOTE_SECRET) return res.status(401).send("Unauthorized");
        
        const user = await db.user.findUnique({ where: { discordId: req.body.discordId }, include: { role: true } });
        if (!user) return res.status(404).send("User not found");

        const newRole = await db.role.findUnique({ where: { id: req.body.roleId } });
        if (!newRole) return res.status(404).send("Role not found");

        if (user.roleId !== 1 && user.role.priority > newRole.priority) return res.status(400).send("User already has a higher role");

        await db.user.update({ where: { discordId: req.body.discordId }, data: { roleId: newRole.id } });
        return res.status(200).send("Role updated");
    });

    return server;
}
