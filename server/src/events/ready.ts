import { ActivityType } from "discord.js";
import { Status as Statuses } from "@prisma/client";
import { DiscordClient } from "../types";
import Event from "../classes/Event";

let i = 0;
function changeStatuses(client: DiscordClient, statuses: Array<Statuses>) {
    if (i > statuses.length - 1) i = 0;

    const status = statuses[i];

    client.user?.setPresence({
        activities: [{
            name: status.text,
            type: ActivityType.Custom
        }],
        status: 'idle'
    });

    setTimeout(() => {
        i++;
        return changeStatuses(client, statuses);
    }, status.delay);
}

export default new Event({
    once: true,
    async execute(client: DiscordClient): Promise<void> {
        console.log(`${client.user?.username} is ready!`)

        //set cycling statuses
        const statuses = await client.db.status.findMany();
        if (statuses.length) changeStatuses(client, statuses);
    }
});