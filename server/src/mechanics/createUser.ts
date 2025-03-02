import { User } from "discord.js";
import { DiscordClient } from "src/types";

export async function createUser(user: User, client: DiscordClient, locale: string) {
    let player = await client.db.user.upsert({
        where: { discordId: user.id },
        update: { },
        create: { 
            discordId: user.id, 
            username: user.username,
            config: { create: { locale: locale } },
            stats: { create: {} },
            items: { create: [{ itemId: 1, count: 15 }, { itemId: 2, count: 1 }, { itemId: 3, count: 1 }, { itemId: 4, count: 1 }] }
        },
        include: { config: true, role: true }
    });

    return player;
}