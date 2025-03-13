import { REST, Routes } from 'discord.js';
import dotenv from 'dotenv';

dotenv.config({
    path: `${process.cwd()}/../../.env`
});

const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
const route = Routes.entitlements(process.env.DISCORD_CLIENT_ID);

await rest.delete(route + "/1349730700760190979" as any);

await rest.post(route, {
    body: {
        sku_id: "1349711413806891109",
        owner_id: "307831219083542530",
        owner_type: 2
    }
})