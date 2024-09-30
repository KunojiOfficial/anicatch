import { ClusterClient, IPCMessage, getInfo } from 'discord-hybrid-sharding'
import { default as Client } from './classes/Client.js';

const client = new Client({
    shards: getInfo().SHARD_LIST,
    shardCount: getInfo().TOTAL_SHARDS,
    intents: 3243773,
});

client.cluster = new ClusterClient(client);

client.cluster.on('message', async message => {
    const action = (message as IPCMessage).action;
    switch (action) {
        case "deploy":
            await client.deployCommands();
            break;
        case "directMessage":
            const msg = message as any;
            
            try {
                const user = await client.users.fetch(msg.user);
                if (!user) return await msg.reply({ found: false });

                const sent = await user.send(msg.content);
                if (sent) return await msg.reply({ found: true });
            } catch (err) {
                return await msg.reply({ found: false });
            }
            
            break;
    }
});

client.login(process.env.BOT_TOKEN);