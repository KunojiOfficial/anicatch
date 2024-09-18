import winston from 'winston';
import { WebhookClient } from "discord.js";
import { DiscordClient } from "../types";

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.cli(),
    transports: [
        new winston.transports.Console()
    ]
});

let webhookDetails = {};

export default class Logger {
    client: DiscordClient
    webhooks: {
        error: WebhookClient
    }

    constructor(client: DiscordClient) {
        this.client = client;

        this.webhooks = {
            error: new WebhookClient({ url: client.config.webhooks.error })
        }

        webhookDetails = {
            username: client.user?.displayName,
            avatarURL: client.user?.displayAvatarURL()
        };
    }

    error(err : Error) {
        logger.error(err);

        this.webhooks.error.send({
            ...webhookDetails,
            embeds: [ {
                title: `Cluster #${this.client.cluster?.id}`,
                description: `\`\`\`js\n${err.stack}\`\`\``,
                color: 0xff0000
            } ]
        }).catch(console.error)
    }
}