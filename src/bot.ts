import { ClusterClient, IPCMessage, getInfo } from 'discord-hybrid-sharding'
import { TextBasedChannel } from 'discord.js';

import { default as Client } from './classes/Client.ts';
import Logger from './classes/Logger.ts';

const client = new Client({
    shards: getInfo().SHARD_LIST,
    shardCount: getInfo().TOTAL_SHARDS,
    intents: 3243773,
});

client.cluster = new ClusterClient(client);
client.logger = new Logger(client.cluster.id);

client.cluster.on('message', async message => {
    const action = (message as IPCMessage).action;
    const msg = message as any;

    switch (action) {
        case "directMessage":
            
            try {
                const user = await client.users.fetch(msg.user);
                if (!user) return await msg.reply({ found: false });

                const sent = await user.send(msg.content);
                if (sent) return await msg.reply({ found: true });
            } catch (err) {
                return await msg.reply({ found: false });
            }
            
            break;
        case "edit":
            try {
                let channel = await client.channels.cache.get(msg.channelId);
                if (!channel || !channel.isTextBased()) return;
                let txtChannel: TextBasedChannel = channel as TextBasedChannel;

                const message = await txtChannel.messages.fetch(msg.messageId);
                if (!message) return;

                await message.edit(msg.content);
            } catch (err) {
                return;
            }
            break;
    }
});


// Handle the 'error' event from the client
client.on('error', (error) => {
    console.error('An error occurred in the Discord client:', error);
});

// Handle the 'warn' event from the client
client.on('warn', (warning) => {
    console.warn('Warning:', warning);
});

// Handle unhandled promise rejections globally
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Promise Rejection:', reason);
});

// Handle uncaught exceptions globally
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

client.login(process.env.BOT_TOKEN);

export default {};