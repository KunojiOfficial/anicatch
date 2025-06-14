import { InteractionReplyOptions } from "discord.js";
import { DiscordInteraction } from "../types.ts";
import { getBenefits } from "../helpers/utils.ts";

import Panel from "../classes/Panel.ts";

export default new Panel({
    name: "premium",
    async execute(interaction: DiscordInteraction, tier: number = 1): Promise<InteractionReplyOptions> {
        const { client, user } = interaction;

        if (typeof tier === "string") tier = parseInt(tier);

        const premiumRoles = await client.db.role.findMany({ where: { skuId: { not: null } }, orderBy: { maxEncounters: 'desc' } });
        if (!premiumRoles.length) throw "no premium roles";

        let currentTier = premiumRoles[tier];
        if (!currentTier) currentTier = premiumRoles[0];
        
        const benefits = await getBenefits(currentTier, client.db);

        return {
            embeds: [ interaction.components.embed({
                author: { name: `{locale_main_premium} - ${user.displayName}`, iconUrl: user.displayAvatarURL() },
                description: `{locale_main_premiumText}\n### ${currentTier.emoji} ${currentTier.name}\n${benefits.text}`,
                thumbnail: client.user!.displayAvatarURL(),
                color: currentTier.color || undefined
            }, benefits.variables) ],
            components: [
                interaction.components.buttons(premiumRoles.map((role,i) => ({
                    id: "0",
                    label: `{locale_main_tier} ${premiumRoles.length-i}`,
                    hardEmoji: role.emoji || undefined,
                    disabled: tier === i,
                    style: tier === i ? "blurple" : "gray",
                    args: { path: "premium", tier: i }
                }))),
                interaction.components.buttons([{
                    style: "premium",
                    skuId: currentTier.skuId!
                }, {
                    style: "link",
                    label: "{locale_main_browseStore}",
                    url: "{config_urls_store}"
                }])
            ]
        }
    }
}); 