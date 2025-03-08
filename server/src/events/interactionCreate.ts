import { Collection } from "discord.js";
import { DiscordInteraction } from "../types";
import Interaction from "../classes/Interaction";
import Event from "../classes/Event";

const cooldowns = new Collection();

export default new Event({
    async execute(interaction: DiscordInteraction): Promise<void> {

        const myInteraction = new Interaction(interaction, cooldowns as any);
        return await myInteraction.process();
    }
});

