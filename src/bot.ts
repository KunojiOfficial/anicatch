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
    }
});

client.login(process.env.BOT_TOKEN);