import { InteractionReplyOptions, User } from "discord.js";
import { DiscordInteraction } from "../types.ts";

import Panel from "../classes/Panel.ts";

export default new Panel({
    name: "profile",
    async execute(interaction: DiscordInteraction, user: User): Promise<InteractionReplyOptions> {
        const { client } = interaction;

        const userData = await client.db.user.findFirst({ where: { discordId: user.id }, include: { role: true, stats: true, profile: true, config: true, cards: { where: { status: { in: ["DEAD", "FIGHT", "IDLE", "TRADE"] } } }, trades: { where: { status: "ACCEPTED" } } } });
        const isOwner = user.id === interaction.user!.id;

        if (!userData) throw 7; //user not registered
        if (!userData.config?.profile && !isOwner) throw 73; //user profile is private 

        const canCustomize = userData?.role?.canCustomize || false;

        const buttons:any = [ {
            id: "0F",
            label: "{locale_main_viewCollection}",
            emoji: "favorite2",
            args: { path: "collection", page: 1, userId: user.id }
        } ];

        if (isOwner && canCustomize) {
            buttons.push({
                id: "23",
                label: "{locale_main_customizeProfile}",
                emoji: "star"
            });
        }

        return {
            embeds: [ interaction.components.embed({
                author: { name: `{locale_main_profileTitle} - ${user.displayName}`, iconUrl: interaction.user.displayAvatarURL() },
                thumbnail: user.displayAvatarURL(),
                description: canCustomize && userData?.profile?.description ? userData.profile.description : undefined,
                color: canCustomize && userData?.profile?.color ? userData.profile.color : undefined,
                fields: [
                    { name: "{locale_main_joinDate}", value: client.unixDate(userData.createdAt, "short"), inline: true },
                    { name: "{locale_main_role}", value: `${userData.role.emoji} ${userData.role.name}`, inline: true },
                    { name: "\u2800", value: `\u2800`, inline: true },
                    { name: "{locale_main_coins}", value: `{emoji_smallCoin}{number_${userData.coins}}`, inline: true },
                    { name: "{locale_main_gems}", value: `{emoji_smallGem}{number_${userData.gems}}`, inline: true },
                    { name: "{locale_main_encountersName}", value: `{emoji_encounters} {number_${userData.encounters}}`, inline: true },
                    { name: "{locale_main_animonsCollection}", value: `{emoji_favorite2} {number_${userData.cards.length}}`, inline: true },
                    { name: "{locale_main_encountered}", value: `{emoji_emptyball} {number_${userData.stats?.encountered}}`, inline: true },
                    { name: "{locale_main_captured}", value: `{emoji_aniball} {number_${userData.stats?.captured}}`, inline: true },
                    { name: "{locale_main_coinsSpent}", value: `{emoji_smallCoin}{number_${userData.stats?.coinsSpent}}`, inline: true },
                    { name: "{locale_main_gemsSpent}", value: `{emoji_smallGem}{number_${userData.stats?.gemsSpent}}`, inline: true },
                    { name: "{locale_main_tradesMade}", value: `{emoji_stats} {number_${userData.trades.length}}`, inline: true }
                ]
            }) ],
            components: [ interaction.components.buttons(buttons) ]
        }
    }
}); 