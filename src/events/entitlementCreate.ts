import { Entitlement } from "discord.js";
import Event from "../classes/Event";
import Components from "../classes/Components";
import { DiscordClient } from "../types";

import vouchersData from "../data/vouchers.json";

export default new Event({
    async execute(entitlement: Entitlement): Promise<void> {
        const client = entitlement.client as DiscordClient;
        const user = await entitlement.fetchUser();

        if (!user) throw "no user";

        let locale = "en-US";
        const player = await client.db.user.findFirst({ where: { discordId: user.id }, include: { config: true } });
        if (player) locale = player.config?.locale || "en-US";

        const components = new Components(client, locale, user);
        const data = vouchersData[entitlement.skuId as keyof typeof vouchersData];

        await user.send({
            embeds: [ components.embed({
                description: `### Thanks for your purchase! ❤️\nYou’ve successfully acquired **${data.gems} {locale_main_${data.type}}**.\nBefore these items can be added to your account, head over to your {command_vouchers} and activate the one you just picked up.\nWe hope you enjoy your new goodies!\n\nIf you run into any issues while activating your vouchers, feel free to hop into our [support server]({config_urls_support})!`,
                thumbnail: client.getEmojiUrl("gem")
            }) ],
            components: [ components.buttons([{
                id: '0F',
                label: "Activate Voucher",
                emoji: "smallGem",
                args: { path: "vouchers" }
            }]) ]
        });
    }
});