import { InteractionReplyOptions } from "discord.js";
import { DiscordInteraction } from "../types.ts";
import Panel from "../classes/Panel.ts";

export default new Panel({
    name: "gems",
    async execute(interaction: DiscordInteraction): Promise<InteractionReplyOptions> {
        const { user, client } = interaction;

        return { 
            embeds: [ interaction.components.embed({
                author: { name: `{locale_main_gemStore} - ${user.displayName}`, iconUrl: user.displayAvatarURL() },
                description: `{locale_main_gemStoreText}`,
                thumbnail: client.getEmojiUrl("gem")
            }) ],
            components: [ interaction.components.buttons([{
                label: "{locale_main_buyGems}",
                url: "{config_urls_store}",
                emoji: "smallGem"
            }]) ]
        }
    }
}); 