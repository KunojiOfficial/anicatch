import { BaseMessage, ClusterManager } from 'discord-hybrid-sharding';

import express from 'express';
import bodyParser from 'body-parser';
import path from 'path';

import apiRouter from './api';
import { createServer } from 'http';

import { db } from 'index';
import { base26ToBase10 } from 'src/helpers/utils';

export default (clusterManager: ClusterManager) => {
    const app = express();
    const server = createServer(app);

    const port = process.env.PORT || 3000;
    
    app.set('view engine', 'ejs');
    app.set('views', path.join(process.cwd(), 'src/web/views'))

    app.set('trust proxy', 1);
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));

    app.use('/api', apiRouter);
    
    app.get("/admin", (_, res) => {
        res.render('admin');
    });

    app.post("/admin", async (req, res) => {
        if (req.body.password !== process.env.ADMIN_PASSWORD) return;
        try {
            switch (req.body.action) {
                case "reload":
                    clusterManager.broadcast(new BaseMessage({action: "deploy"}))
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

    server.listen(port, () => {
        console.log("Web interface is live on port " + port + "!");
    })
}
