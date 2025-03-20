import { InteractionReplyOptions } from "discord.js";
import { DiscordInteraction } from "../types";
import Panel from "../classes/Panel";

export default new Panel({
    name: "itemList",
    async execute(interaction: DiscordInteraction): Promise<InteractionReplyOptions> {
        const { client } = interaction;

        let text = "-# **`{locale_main_id} `**\u2800{emoji_empty}\u2800**{locale_main_NAME}**\n\n";
        const items = await client.db.item.findMany({ orderBy: { id: "asc" } });
        for (const item of items) {
            text += `-# \`${item.id.toString().padEnd(3, " ")}\`\u2800${item.emoji}\u2800{locale_items_${item.name}_name}\n`;
        }

        return { 
            embeds: [ interaction.components.embed({
                description: text
            }) ],
            ephemeral: true
        }
    }
}); 