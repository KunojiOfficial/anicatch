import { InteractionReplyOptions } from "discord.js";
import { DiscordInteraction } from "../types.ts";
import Panel from "../classes/Panel.ts";

import guide from "../data/guide.json";

export default new Panel({
    name: "guide",
    async execute(interaction: DiscordInteraction, category: string, subcategory: string): Promise<InteractionReplyOptions> {
        
        const categories = Object.keys(guide);
        if (!categories.includes(category)) category = categories[0];

        const subcategories = guide[category];
        if (!subcategories.includes(subcategory)) subcategory = subcategories[0];

        return {
            embeds: [ interaction.components.embed({
                author: { name: `{locale_main_guide} - ${interaction.user.displayName}`, iconUrl: interaction.user.displayAvatarURL() },
                title: `{locale_guide_${category}_name} - {locale_guide_${category}_${subcategory}_name}`,
                description: `{locale_guide_${category}_${subcategory}_description}`,
                thumbnail: interaction.client.user.displayAvatarURL()
            }) ],
            components: [ interaction.components.selectMenu({
                id: 0,
                options: categories.map(c => ({ label: `{locale_guide_${c}_name}`, value: `1:${c}`, default: c === category })),
                args: { path: "guide" }
            }), interaction.components.selectMenu({
                id: 0,
                options: subcategories.map(c => ({ label: `{locale_guide_${category}_${c}_name}`, value: `2:${c}`, default: c === subcategory })),
                args: { path: "guide", category: category}
            }), interaction.components.buttons([{
                id: "0",
                emoji: "chevron.single.left",
                args: { path: "guide", category: category, subcategory: subcategories[Math.max(subcategories.indexOf(subcategory)-1,0)] }
            }, {
                id: "0",
                emoji: "chevron.single.right",
                args: { path: "guide", category: category, subcategory: subcategories[Math.min(subcategories.indexOf(subcategory)+1,subcategories.length-1)] }
            }]) ]
        }

    }
}); 