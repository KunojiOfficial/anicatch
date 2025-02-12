import { InteractionReplyOptions, MessageManager } from "discord.js";
import Interactable from "../../classes/Interactable";

export default new Interactable({
    id: 4,
    async execute(interaction): Promise<InteractionReplyOptions> {
        const { args, client, player } = interaction;
        let [ itemId, count, currency ] = args;

        itemId = parseInt(itemId);
        count = parseInt(count);

        if (count < 1) count = 1;

        let item, cost:number = 0;
        await client.db.$transaction(async tx => {
            item = await tx.item.findFirst({ where: { id: itemId } });
            if (!item) throw "wrong itemId";

            let update;
            if (currency === "coins") {
                if (!item.priceCoin) throw 11;

                cost = count * (item.priceCoin*(1-(item.discount||0)));

                if (player.data.coins < cost) throw 9;
                interaction.player.data.coins -= cost||0;
                update = await tx.user.update({ where: { id: player.data.id }, data: { coins: { decrement: cost } } });

            } else if (currency === "gems") {
                if (!item.priceGem) throw 11;

                cost = count * (item.priceGem*(1-(item.discount||0)));

                if (player.data.gems < cost) throw 10;
                interaction.player.data.gems -= cost||0;
                update = await tx.user.update({ where: { id: player.data.id }, data: { gems: { decrement: cost } } });
            }

            await tx.log.create({ data: { userId: player.data.id, action: "buy", description: `Item "${itemId}" x${count} for ${cost} ${currency}; new balance: ${player.data.coins}c${player.data.gems}g` } });

            if (!update) throw 11;

            await tx.inventory.upsert({
                where: { itemId_userId: { itemId: itemId, userId: player.data.id } },
                update: { count: { increment: count } },
                create: {
                    itemId: itemId, 
                    userId: player.data.id,
                    count: count,
                }
            });
        });

        const msg = await client.panels.get("store")!.execute!(interaction, item!.type, itemId, count);

        return {
            ...msg,
            embeds: [ ...msg.embeds!, interaction.components.embed({
                color: "#00ff00",
                description: `{emoji_yes}\u2800{locale_main_buySuccess}\n-# \u2800\u2800\u2800{locale_main_buySuccess2}`
            }, {
                item: [`**${count}x ${item!.emoji} ${client.formatText(`{locale_items_${item!.name}_name}`, interaction.locale)}**`],
                cost: [((currency === "gems" ? `{emoji_smallGem}` : `{emoji_smallCoin}`) + ` **{number_${cost}}**`)]
            }) ]
        }
    }
})