import { PrismaClient } from "@prisma/client";
import { ClusterManager } from 'discord-hybrid-sharding';
import dotenv from "dotenv";

import Formatter from "src/classes/Formatter";
import Logger from "src/classes/Logger";

import encounterRecharge from "./src/intervals/encounterRecharge";
import voteNotifications from "src/intervals/voteNotifications";

import website from './src/web/app';
import loadCommandsData from "src/helpers/loadCommandsData";
import deployCommands from "src/helpers/deployCommands";

dotenv.config();

//load commands data for the formatter
loadCommandsData();

//main formatter
const formatter = new Formatter();
const logger = new Logger({ cluster: { id: "--" } } as any);

//deploy commands
deployCommands(logger, formatter);

const manager = new ClusterManager(`${process.cwd()}/src/bot.${process.env.NODE_ENV === 'production' ? 'js' : 'ts'}`, {
	totalShards: 'auto',
	shardsPerClusters: 2,
	mode: 'process',
	token: process.env.BOT_TOKEN,
	execArgv: [ ...process.execArgv ]
});

let spawnedClusters = 0; // To count the number of spawned clusters

manager.on('clusterCreate', cluster => {
	logger.info(`Launched Cluster ${cluster.id}`);
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

//prisma intervals
const db = new PrismaClient();
function startPrismaIntervals() {
	encounterRecharge(db, manager);
	voteNotifications(db, manager);
}

//web server
website.listen(process.env.PORT || 3000, () => {
	logger.info(`Website is running on port ${process.env.PORT || 3000}`);
});

export { manager, db, formatter };