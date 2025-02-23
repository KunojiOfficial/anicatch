import { BaseMessage, ClusterManager } from 'discord-hybrid-sharding';

import express from 'express';
import bodyParser from 'body-parser';
import path from 'path';

import apiRouter from './api';
import { createServer } from 'http';

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

    app.post("/admin", (req) => {
        if (req.body.password !== process.env.ADMIN_PASSWORD) return;
        switch (req.body.action) {
            case "reload":
                clusterManager.broadcast(new BaseMessage({action: "deploy"}))
                break;
        }
    });

    server.listen(port, () => {
        console.log("Web interface is live on port " + port + "!");
    })
}
