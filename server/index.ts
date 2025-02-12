import dotenv from "dotenv";
import { BaseMessage, ClusterManager } from 'discord-hybrid-sharding';

import website from './src/web/app';
import { PrismaClient } from "@prisma/client";
import encounterRecharge from "./src/intervals/encounterRecharge";

dotenv.config();

const manager = new ClusterManager(`${__dirname}/src/bot.js`, {
  totalShards: 'auto',
  shardsPerClusters: 2,
  // totalClusters: 7,
  mode: 'process',
  token: process.env.BOT_TOKEN,
});

let spawnedClusters = 0; // To count the number of spawned clusters

manager.on('clusterCreate', cluster => {
  console.log(`Launched Cluster ${cluster.id}`);
  spawnedClusters++;

  if (spawnedClusters === manager.totalClusters) {
    startPrismaIntervals();
  }
});

// Handle shard errors
manager.on('shardError', (error, shardId) => {
  console.error(`Shard ${shardId} encountered an error:`, error);
});

// Handle when a shard becomes ready
manager.on('shardReady', (shardId) => {
  console.log(`Shard ${shardId} is ready.`);
});

// Handle when a shard is disconnected
manager.on('shardDisconnect', (event, shardId) => {
  console.warn(`Shard ${shardId} disconnected:`, event);
});

// Handle when a shard attempts to reconnect
manager.on('shardReconnecting', (shardId) => {
  console.warn(`Shard ${shardId} is reconnecting...`);
});

// Handle general errors in the shard manager
manager.on('error', (error) => {
  console.error('Shard Manager Error:', error);
});

manager.spawn({ timeout: -1 });

//start website interface
website(manager);

//prisma intervals
const db = new PrismaClient();
function startPrismaIntervals() {
  encounterRecharge(db, manager);  
}