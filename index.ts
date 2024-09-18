import dotenv from "dotenv";
import { ClusterManager } from 'discord-hybrid-sharding';

import website from './src/web/app';

dotenv.config();

const manager = new ClusterManager(`${__dirname}/src/bot.js`, {
  totalShards: 'auto',
  shardsPerClusters: 2,
  // totalClusters: 7,
  mode: 'process',
  token: process.env.BOT_TOKEN,
});


manager.on('clusterCreate', cluster => {
  console.log(`Launched Cluster ${cluster.id}`);
  
  // cluster.on('message', async message => {
  //   const action = (message as IPCMessage);

  // });

});

manager.spawn({ timeout: -1 });

//start website interface
website(manager);