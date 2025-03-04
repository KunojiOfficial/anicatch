import { Entitlement } from "discord.js";
import Event from "../classes/Event";
import Components from "../classes/Components";
import { DiscordClient } from "../types";

import vouchersData from "../data/vouchers.json";
import Player from "src/classes/Player";
import { createUser } from "src/mechanics/createUser";

export default new Event({
    async execute(entitlement: Entitlement): Promise<void> {
        const client = entitlement.client as DiscordClient;
        const user = await entitlement.fetchUser();

        if (!user) throw "no user";

        let locale = "en-US";
        
        const player = await createUser(user, client, "en-US");
        locale = player.config?.locale || "en-US";

        const components = new Components(client, locale, new Player(user, player, player.role, player.config));
        const data = vouchersData[entitlement.skuId as keyof typeof vouchersData];

        // Add the entitlement to the user's account
        switch (data.type) {
            case "gems":
                await entitlement.consume();
                await client.db.user.updateMany({ where: { id: player.id }, data: { gems: { increment: data.gems } } });
                await client.db.log.create({ data: { userId: player.id, action: "gem-purchase", description: `bought ${data.gems} gems` } });
                break;
            default:
                break;
        }

        await user.send({
            embeds: [ components.embed({
                description: `### Thanks for your purchase! ❤️\nYou’ve successfully acquired **${data.gems} {locale_main_${data.type}}**.\nWe hope you enjoy your new goodies!\n\nIf you haven't received your goods, hop into our [support server]({config_urls_support})!`,
                thumbnail: client.getEmojiUrl("gem")
            }) ]
        });
    }
});