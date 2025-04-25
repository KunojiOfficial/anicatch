import { InteractionReplyOptions } from "discord.js";
import { DiscordInteraction } from "../types.ts";
import Panel from "../classes/Panel.ts";

import entitlements from "../config/entitlements.json";

export default new Panel({
    name: "gems",
    async execute(interaction: DiscordInteraction): Promise<InteractionReplyOptions> {
        const { user, client } = interaction;

        const gems = entitlements.filter(e => e.type === "consumable" && e.rewards?.find(r => r.type === "gems"));
        const buttons = [[]];
        for (const gem of gems) {
            if (buttons[buttons.length-1].length >= 3) buttons.push([]);
            buttons[buttons.length-1].push({
                style: "premium",
                skuId: gem.id
            });
        }

        return { 
            embeds: [ interaction.components.embed({
                author: { name: `{locale_main_gemStore} - ${user.displayName}`, iconUrl: user.displayAvatarURL() },
                description: `{locale_main_gemStoreText}`,
                thumbnail: client.getEmojiUrl("gem")
            }) ],
            components: buttons.map(b => interaction.components.buttons(b))
        }
    }
}); 