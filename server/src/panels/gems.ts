import { InteractionReplyOptions } from "discord.js";
import { DiscordInteraction } from "../types";
import Panel from "../classes/Panel";

export default new Panel({
    name: "gems",
    async execute(interaction: DiscordInteraction): Promise<InteractionReplyOptions> {
        const { user, client } = interaction;

        return { 
            embeds: [ interaction.components.embed({
                author: { name: `Gem Store - ${user.displayName}`, iconUrl: user.displayAvatarURL() },
                description: `Buy **{emoji_smallGem} Gems** and level up your experience!\nWith gems, you can grab exclusive items in the {command_store}, unlock a second catch chance, and more!\n\nTo purchase **{emoji_smallGem} Gems**, head over to our [Discord Store]({config_urls_store}).\nBy making a purchase, you agree to our [Terms of Service]({config_urls_tos}).`,
                thumbnail: client.getEmojiUrl("gem")
            }) ],
            components: [ interaction.components.buttons([{
                label: "Buy Gems",
                url: "{config_urls_store}",
                emoji: "smallGem"
            }]) ]
        }
    }
}); 