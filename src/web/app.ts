import { createServer } from 'http';
import { BaseMessage, ClusterManager } from 'discord-hybrid-sharding';
import express from 'express';
import bodyParser from 'body-parser';
import path from 'path';

import { base26ToBase10 } from '../helpers/utils.ts';
import Vote from '../classes/Vote.ts';

import { PrismaClient } from '@prisma/client';
import Formatter from '../classes/Formatter.ts';

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
            }
        } catch (e) {
            console.error(e);
        }
    
        res.redirect("/admin");
    });
    
    app.post("/vote", async (req, res) => {
        if (req.headers.authorization !== process.env.VOTE_SECRET && req.body.password !== process.env.ADMIN_PASSWORD) return res.status(401).send("Unauthorized");
        
        try {
            const requestingUrl = new URL(req.headers.referer || req.headers.origin).hostname;
            const id = req.body.user;
    
            await new Vote(id, requestingUrl, db, manager, formatter).process();
            
            res.status(200).send("Vote processed");
        } catch (e) {
            console.error(e)
            res.status(500).send("Error processing vote");
        }
    });

    return server;
}
