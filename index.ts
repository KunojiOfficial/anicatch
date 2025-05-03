import { PrismaClient } from "@prisma/client";
import { ClusterManager } from 'discord-hybrid-sharding';
import dotenv from "dotenv";

import encounterRecharge from "./src/intervals/encounterRecharge.ts";
import voteNotifications from "./src/intervals/voteNotifications.ts";

import loadCommandsData from "./src/helpers/loadCommandsData.ts";
import deployCommands from "./src/helpers/deployCommands.ts";

import Formatter from "./src/classes/Formatter.ts";
import Logger from "./src/classes/Logger.ts";
import redeemEntitlements from "./src/intervals/redeemEntitlements.ts";
import startServer from "./src/web/app.ts";

dotenv.config();

let logger, formatter;

// Initialize the database
const db = new PrismaClient();

// Initialize the cluster manager
const manager = new ClusterManager(`${process.cwd()}/src/bot.${process.env.NODE_ENV === 'production' ? 'js' : 'ts'}`, {
	totalShards: 'auto',
	shardsPerClusters: 2,
	mode: 'process',
	token: process.env.BOT_TOKEN,
	execArgv: [ ...process.execArgv ]
});

(async () => {
	// Load commands data for the formatter
	await loadCommandsData();
	
	// Initialize logger and formatter
	formatter = new Formatter();
	logger = new Logger("--" as any);
	
	// Deploy commands
	if (process.env.NODE_ENV !== "development") await deployCommands(logger, formatter);

	// Spawn the clusters
	manager.spawn({ timeout: -1 });
	
	// Start the website
	const website = startServer(manager, db, formatter);
	website.listen(process.env.PORT || 3000, () => {
		logger.info(`Website is running on port ${process.env.PORT || 3000}`);
	});
})();

let spawnedClusters = 0;

manager.on('clusterCreate', async cluster => {
	logger.info(`Launched Cluster ${cluster.id}`);
	spawnedClusters++;
	
	if (spawnedClusters === manager.totalClusters) {
		//encounterRecharge(db, manager, formatter);
		voteNotifications(db, manager, formatter);
		if (process.env.NODE_ENV !== "development") redeemEntitlements(db, manager, formatter);
	}
});