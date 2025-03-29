import { InteractionReplyOptions } from "discord.js";
import { DiscordInteraction } from "../types.ts";
import Panel from "../classes/Panel.ts";

import credits from "../config/credits.json";

export default new Panel({
    name: "credits",
    async execute(interaction: DiscordInteraction): Promise<InteractionReplyOptions> {
        return { 
            embeds: [ interaction.components.embed({
                description: "-# {locale_main_disclaimer}\n\u2800",
                fields: credits
            }) ],
            flags: ["Ephemeral"]
        }
    }
}); 