import { InteractionReplyOptions } from "discord.js";
import { DiscordInteraction } from "../types.ts";
import Panel from "../classes/Panel.ts";
import Referral from "../classes/Referral.ts";

export default new Panel({
    name: "referral",
    async execute(interaction: DiscordInteraction): Promise<InteractionReplyOptions> {
        const { player } = interaction;

        // Check if the player has a referral code
        if (!player.data.referralCode) player.data.referralCode = await player.generateReferralCode(interaction.client);

        const referral = new Referral();
        const referrals = await player.getReferrals(interaction.client.db);
        const referredBy = await player.getReferredBy(interaction.client.db);

        const stats = await interaction.client.db.userStats.findFirst({ where: { userId: player.data.id } });

        return {
            flags: ["IsComponentsV2"],
            components: interaction.componentsV2.construct([{
                type: "Container", components: [
                    { type: "TextDisplay", text_display_data: { content: `-# ${player.user} - {locale_main_referralSystem}` } },
                    { type: "Separator" },
                    { type: "Section", section_data: { components: [
                        { type: "TextDisplay", text_display_data: { content: `{locale_main_referralDesc}\n\u2800` } },
                        { type: "TextDisplay", text_display_data: { content: `### {locale_main_yourCode}:\n\`\`\`${player.data.referralCode}\`\`\`` } }
                    ], accessory: { type: "Thumbnail", thumbnail_data: { media: { url: player.user.displayAvatarURL() } } } } },
                    { type: "Separator", separator_data: { spacing: 2 } },
                    { type: "TextDisplay", text_display_data: { content: `**{locale_main_referralRewards}:**\n${referral.rewardsText}` } },
                    { type: "Separator", separator_data: { spacing: 2 } },
                    { type: "TextDisplay", text_display_data: { content: `**{locale_main_referredCount}:** ${referrals.referrals.length}\n**{locale_main_referredFinishedCount}**: ${referrals.finished.length}` }},
                    { type: "Separator", separator_data: { spacing: 2 } },
                    referredBy ? { type: "Section", section_data: { components: [
                        { type: "TextDisplay", text_display_data: { content: `{locale_main_referredProgress}\n` + (stats.captured < 5 ? `{locale_main_referredRemaining}` : player.data.refClaimed ? `{locale_main_referralClaimed}` : `{locale_main_referralCanClaim}`) } }
                    ], accessory: { type: "Button", button_data: {
                        label: `{locale_main_claimRewards}`,
                        emoji: "wyes",
                        id: "29",
                        style: "Success",
                        disabled: stats.captured < 5 || player.data.refClaimed,
                        cooldown: { time: 5, id: "ref" }
                    } } } } : null
                ]
            }], {
                referred: [referredBy],
                remaining: [`${5-stats.captured}`]
            })
        }
    }
}); 