import { REST, Routes } from "discord.js";
import { writeFile } from 'fs/promises';
import { join } from 'path';

export default async function loadCommandsData() {
    const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
    const route = process.env.NODE_ENV === "development" ? Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, process.env.DEV_GUILD_ID) : Routes.applicationCommands(process.env.DISCORD_CLIENT_ID);
    const commandsData = await rest.get(route);
    
    const object: any = {};
    for (const command of commandsData as any) {
        if (command.options?.find((o:any) => o.type === 1)) { //subcommands
            for (const sub of command.options?.filter((o:any) => o.type === 1)) {
                object[`${command.name} ${sub.name}`] = command.id;
            }
        }

        object[command.name] = command.id;
    }

    const filePath = join(process.cwd(), '/src/assets/commands.json');
    await writeFile(filePath, JSON.stringify(object, null, 4), 'utf-8');
}