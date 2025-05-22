import { InteractionReplyOptions } from "discord.js";
import { DiscordInteraction } from "../types.ts";
import Panel from "../classes/Panel.ts";

import entitlements from "../config/entitlements.json";
import { Component } from "../types/componentTypes.ts";

export default new Panel({
    name: "gems",
    async execute(interaction: DiscordInteraction): Promise<InteractionReplyOptions> {
        const { user, client, player } = interaction;
        const isMobile = player.config.isMobile;

        const gems = entitlements.filter(e => e.type === "consumable" && e.rewards?.find(r => r.type === "gems"));
        const components: Component[] = gems.map((gem, index) => {
            return {
                type: "Section", section_data: { components: [
                    { type: "TextDisplay", text_display_data: { content: `{emoji_smallGem} **${gem.name}**` } }
                ], accessory: { type: "Button", button_data: 
                    isMobile? { label: `\u2800{locale_main_buy}\u2800$${gem.price.toString().padStart(5,"\u2800")}`, style: "Link", emoji: "smallGem", url: `https://gems.anicatch.com/buy/${index}` } :
                     { skuId: gem.id, style: "Premium" }
                 } }
            };
        });

        return {
            flags: ["IsComponentsV2"],
            components: interaction.componentsV2.construct([{
                type: "Container", components: [
                    { type: "TextDisplay", text_display_data: { content: `${user} - {locale_main_gemStore}` } },
                    { type: "Separator" },
                    { type: "Section", section_data: { components: [
                        { type: "TextDisplay", text_display_data: { content: `{locale_main_gemStoreText}\n\u2800` } },
                    ], accessory: { type: "Thumbnail", thumbnail_data: { media: { url: client.getEmojiUrl("gem") } } } } },
                    { type: "ActionRow", components: [
                        { type: "Button", button_data: { label: "\u2800{locale_main_ourStore}", style: "Link", url: "https://anicatch.com/store", emoji: "smallGem"  } },
                        { type: "Button", button_data: { label: "\u2800{locale_main_discordStore}", style: "Link", url: "{config_urls_store}", emoji: "smallGem"  } },
                    ] },
                    { type: "Separator", separator_data: { spacing: 2 } },
                    ...components,
                    { type: "Separator", separator_data: { spacing: 2 } },
                    { type: "TextDisplay", text_display_data: { content: `{locale_main_gemsDisclaimer}` } },
                ]
            }])
        }

        // return { 
        //     embeds: [ interaction.components.embed({
        //         author: { name: `{locale_main_gemStore} - ${user.displayName}`, iconUrl: user.displayAvatarURL() },
        //         description: `{locale_main_gemStoreText}`,
        //         thumbnail: client.getEmojiUrl("gem")
        //     }) ],
        //     components: player.config.isMobile ? [interaction.components.buttons([{
        //         label: "\u2800{locale_main_browseStore}",
        //         style: "link",
        //         emoji: "smallGem",
        //         url: "https://anicatch.com/store"
        //     }])] : buttons.map(b => interaction.components.buttons(b))
        // }
    }
}); 