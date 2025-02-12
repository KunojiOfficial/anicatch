import { InteractionReplyOptions } from "discord.js";
import { DiscordInteraction } from "../types";
import Panel from "../classes/Panel";

import vouchersData from "../data/vouchers.json";

export default new Panel({
    name: "vouchers",
    async execute(interaction: DiscordInteraction): Promise<InteractionReplyOptions> {
        const { user, client, player } = interaction;

        const entitlements = await client.application?.entitlements.fetch({ user: user }) || [];
        const vouchers = [...[...entitlements.values()].filter(enti => !enti.consumed), ...(await client.db.voucher.findMany({ where: { userId: player.data.id, consumed: false } }))];

        const fields = [], options = [];
        for (const voucher of vouchers) {
            const data = vouchersData[voucher.skuId as keyof typeof vouchersData]
            if (!data) continue;
            
            fields.push({ name: `{emoji_${data.emoji}} ${data.gems} {locale_main_${data.type}} {locale_main_voucher}`, value: `-# \u2800\u2800 Redeemable`, inline: true });
            options.push({ label: `${data.gems} {locale_main_${data.type}} {locale_main_voucher}`, emoji: data.emoji, value: `${voucher.skuId}:${Math.random()}` });
        }

        if (!vouchers.length) fields.push({ name: "\u2800", value: `*You don't have any vouchers.\nVisit the Gem Store to purchase some: {command_gems}.*` })

        return { 
            embeds: [ interaction.components.embed({
                author: { name: `Vouchers - ${user.displayName}`, iconUrl: user.displayAvatarURL() },
                description: `Browse and redeem your vouchers using the menu below.\nVouchers can be purchased with the {command_gems} command.\nNeed help redeeming your vouchers? Join our [support server]({config_urls_support})!\n\u2800`,
                fields: fields,
                thumbnail: client.getEmojiUrl("gem")
            }) ],
            components: vouchers.length ? [ interaction.components.selectMenu({
                id: 2,
                options: options,
                placeholder: "💎\u2800Select a voucher to redeem it.",
                cooldown: { id: "voucher", time: 5 }
            }) ] : []
        }
    }
}); 