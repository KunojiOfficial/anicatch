import { InteractionReplyOptions } from "discord.js";
import Interactable from "../../classes/Interactable.ts";

import vouchersData from "../../data/vouchers.json";

export default new Interactable({
    id: 2,
    async execute(interaction): Promise<InteractionReplyOptions> {
        const { values, client, player } = interaction;

        const [ skuId, _ ] = values[0].split(":");
        const entitlements = (await client.application?.entitlements.fetch({ user: player.user, skus: [skuId] }))?.filter(e => !e.consumed) || [];
        if ([...entitlements.values()].length) entitlements.at(0)?.consume();
        else {
            const voucher = await client.db.voucher.findFirst({ where: { skuId: skuId, userId: player.data.id, consumed: false } });
            if (!voucher) throw 26;

            await client.db.voucher.updateMany({ where: { id: voucher.id }, data: { consumed: true } });
        }

        const data = vouchersData[skuId as keyof typeof vouchersData];
        if (!data) throw "no such skuId in the data file";

        switch (data.type) {
            case "gems":
                await client.db.user.updateMany({ where: { id: player.data.id }, data: { gems: { increment: data.gems } } });
                break;
            default:
                break;
        }

        await client.db.log.create({ data: { 
            userId: player.data.id,
            action: "voucher-use",
            description: `used ${skuId} voucher` 
        } });

        await interaction.followUp({
            embeds: [ interaction.components.embed({
                description: `You have successfully redeemed **${data.gems} {locale_main_${data.type}} {locale_main_voucher}**.`,
                color: "#00ff00"
            }) ]
        });

        return await client.panels.get("vouchers")!.execute!(interaction);
    }
})