import { InteractionReplyOptions } from "discord.js";
import { DiscordInteraction } from "../types";
import Panel from "../classes/Panel";

export default new Panel({
    name: "guide",
    async execute(interaction: DiscordInteraction): Promise<InteractionReplyOptions> {
        return { content: "work in progress" }
    }
}); 