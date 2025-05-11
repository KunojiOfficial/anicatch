import { Entitlement } from "discord.js";
import { DiscordClient } from "../types.ts";

import entitlementsData from "../config/entitlements.json";

import Components from "../classes/Components";
import Player from "../classes/Player.ts";

export default async function redeem(entitlement: Entitlement) {
    if (entitlement.consumed) return;
    
    const client = entitlement.client as DiscordClient;
    const user = await entitlement.fetchUser();

    if (!user) throw "no user";

    let locale = "en-US";
    
    const player = new Player(user);
    await player.create(user, client, "en-US");

    locale = player.config?.locale || "en-US";

    const components = new Components(client, locale, player);
    const data = entitlementsData.find(e => e.id === entitlement.skuId && e.type === "consumable");

    // Add the entitlement to the user's account
    await client.db.$transaction(async tx => {
        let update = {};
        for (const reward of data.rewards) {
            update[reward.type] = { increment: reward.amount };
        }

        if (player.data.referredBy) await tx.user.update({ where: { id: player.data.referredBy }, data: { gems: { increment: Math.round((data.rewards.find(d => d.type === "gems")?.amount || 0) * 0.1) || 0 } } });
        await tx.user.updateMany({ where: { id: player.data.id }, data: update });
        await tx.log.create({ data: { userId: player.data.id, action: "consumable-purchase", description: `bought ${data.id}` } });
        await entitlement.consume();
    });

    let rewardsInfo = "";

    for (const reward of data.rewards) {
        rewardsInfo += `* {emoji_${reward.type}} **{number_${reward.amount}}**\n`;
    }

    await user.send({
        embeds: [ components.embed({
            description: `### {locale_main_thanksForPurchase} ❤️\n{locale_main_successfullyAcquired}\n${rewardsInfo}\n{locale_main_hopeYouEnjoy}\n\n-# {locale_main_purchaseHelp}`,
            thumbnail: client.getEmojiUrl("gem")
        })]
    });
}