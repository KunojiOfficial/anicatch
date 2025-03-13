import { InteractionReplyOptions } from "discord.js";
import { DiscordInteraction } from "../types";
import Panel from "../classes/Panel";
import { getBenefits } from "src/helpers/utils";


export default new Panel({
    name: "premium",
    async execute(interaction: DiscordInteraction, tier: number = 1): Promise<InteractionReplyOptions> {
        const { client, user } = interaction;

        if (typeof tier === "string") tier = parseInt(tier);

        const premiumRoles = await client.db.role.findMany({ where: { skuId: { not: null } }, orderBy: { maxEncounters: 'desc' } });
        if (!premiumRoles.length) throw "no premium roles";

        let currentTier = premiumRoles[tier];
        if (!currentTier) currentTier = premiumRoles[0];
        
        const benefits = getBenefits(currentTier);

        return {
            embeds: [ interaction.components.embed({
                author: { name: `{locale_main_premium} - ${user.displayName}`, iconUrl: user.displayAvatarURL() },
                description: `{locale_main_premiumText}\n### ${currentTier.emoji} ${currentTier.name}\n${benefits.text}`,
                thumbnail: client.user.displayAvatarURL(),
                color: currentTier.color
            }, benefits.variables) ],
            components: [
                interaction.components.buttons(premiumRoles.map((role,i) => ({
                    id: "0",
                    label: `{locale_main_tier} ${premiumRoles.length-i}`,
                    emoji: role.emoji,
                    disabled: tier === i,
                    style: tier === i ? "blurple" : "gray",
                    args: { path: "premium", tier: i }
                }))),
                interaction.components.buttons([{
                    style: "premium",
                    skuId: currentTier.skuId
                }, {
                    style: "link",
                    label: "{locale_main_browseStore}",
                    url: "{config_urls_store}"
                }])
            ]
        }
    }
}); 