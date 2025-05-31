import winston from 'winston';
import { User, WebhookClient } from "discord.js";

import config from "../config/main.json";

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.cli(),
    transports: [
        new winston.transports.Console()
    ]
});

let webhookDetails = {};

export default class Logger {
    clusterId: number
    webhooks: {
        error: WebhookClient,
        log: WebhookClient
    }

    constructor(clusterId: number) {
        this.clusterId = clusterId;

        this.webhooks = { error: new WebhookClient({ url: config.webhooks.error }), log: new WebhookClient({ url: config.webhooks.log }) };

        webhookDetails = {
            username: config.bot.name,
        };
    }

    error(err : Error) {
        logger.error(err);

        this.webhooks.error.send({
            ...webhookDetails,
            embeds: [ {
                title: `Cluster #${this.clusterId}`,
                description: `\`\`\`js\n${err.stack}\`\`\``,
                color: 0xff0000
            } ]
        }).catch(console.error)
    }

    info(message: string) {
        logger.info(`[${this.clusterId.toString().padStart(2,'0')}] ${message}`);
    }

    warn(message: string) {
        logger.warn(`[${this.clusterId.toString().padStart(2,'0')}] ${message}`);
    }

    log(message: string) {
        this.webhooks.log.send({
            ...webhookDetails,
            embeds: [ {
                description: message,
                color: 0x0000ff
            } ]
        }).catch(console.error)
    }
}