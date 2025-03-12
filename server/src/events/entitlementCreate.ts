import { Entitlement } from "discord.js";
import Event from "../classes/Event";
import Components from "../classes/Components";
import { DiscordClient } from "../types";

import vouchersData from "../data/vouchers.json";
import Player from "src/classes/Player";

export default new Event({
    async execute(entitlement: Entitlement): Promise<void> {
        const client = entitlement.client as DiscordClient;
        const user = await entitlement.fetchUser();

        if (!user) throw "no user";

        let locale = "en-US";
        
        const player = new Player(user);
        await player.create(user, client, "en-US");

        locale = player.config?.locale || "en-US";

        const components = new Components(client, locale, player);
        const data = vouchersData[entitlement.skuId as keyof typeof vouchersData];

        // Add the entitlement to the user's account
        switch (data.type) {
            case "gems":
                await entitlement.consume();
                await client.db.user.updateMany({ where: { id: player.data.id }, data: { gems: { increment: data.gems } } });
                await client.db.log.create({ data: { userId: player.data.id, action: "gem-purchase", description: `bought ${data.gems} gems` } });
                break;
            default:
                break;
        }

        await user.send({
            embeds: [ components.embed({
                description: `### {locale_main_thanksForPurchase} ❤️\n{locale_main_successfullyAcquired}\n{locale_main_hopeYouEnjoy}\n\n{locale_main_purchaseHelp}`,
                thumbnail: client.getEmojiUrl("gem")
            }, {
                name: [`**${data.gems} {locale_main_${data.type}}**`]
            }) ]
        });
    }
});