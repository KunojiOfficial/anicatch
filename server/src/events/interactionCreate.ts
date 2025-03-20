import { Collection } from "discord.js";
import { DiscordInteraction } from "../types.ts";

import Interaction from "../classes/Interaction.ts";
import Event from "../classes/Event.ts";

const cooldowns = new Collection();

export default new Event({
    async execute(interaction: DiscordInteraction): Promise<void> {

        const myInteraction = new Interaction(interaction, cooldowns as any);
        return await myInteraction.process();
    }
});

