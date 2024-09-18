import express from 'express';
import bodyParser from 'body-parser';
import { BaseMessage, ClusterManager } from 'discord-hybrid-sharding';
import path from 'path';

export default (clusterManager: ClusterManager) => {
    const app = express();
    const port = process.env.PORT || 3000;
    
    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, '/views'))

    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));

    app.get('/', (_, res) => {
        res.send("Hello World!")
    });
    
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
    })
    
    app.listen(port, () => {
        console.log("Web interface is live on port " + port + "!");
    })
}
