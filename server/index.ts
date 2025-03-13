import { PrismaClient } from "@prisma/client";
import { ClusterManager } from 'discord-hybrid-sharding';
import dotenv from "dotenv";

import encounterRecharge from "./src/intervals/encounterRecharge";
import voteNotifications from "src/intervals/voteNotifications";

import website from './src/web/app';
import loadCommandsData from "src/helpers/loadCommandsData";
import deployCommands from "src/helpers/deployCommands";

import Formatter from "src/classes/Formatter";
import Logger from "src/classes/Logger";
import redeemEntitlements from "src/intervals/redeemEntitlements";

dotenv.config();


// Initialize the database
const db = new PrismaClient();

// Load commands data for the formatter
await loadCommandsData();

// Initialize logger and formatter
const formatter = new Formatter();
const logger = new Logger("--" as any);

// Deploy commands
await deployCommands(logger, formatter);

// Initialize the cluster manager
const manager = new ClusterManager(`${process.cwd()}/src/bot.${process.env.NODE_ENV === 'production' ? 'js' : 'ts'}`, {
	totalShards: 'auto',
	shardsPerClusters: 2,
	mode: 'process',
	token: process.env.BOT_TOKEN,
	execArgv: [ ...process.execArgv ]
});

let spawnedClusters = 0;

manager.on('clusterCreate', async cluster => {
	logger.info(`Launched Cluster ${cluster.id}`);
	spawnedClusters++;
	
	if (spawnedClusters === manager.totalClusters) {
		encounterRecharge(db, manager);
		voteNotifications(db, manager);
		redeemEntitlements(db, manager);
	}
});


// Spawn the clusters
manager.spawn({ timeout: -1 });

// Start the website
website.listen(process.env.PORT || 3000, () => {
	logger.info(`Website is running on port ${process.env.PORT || 3000}`);
});

export { manager, db, formatter };