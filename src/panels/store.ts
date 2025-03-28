import { InteractionReplyOptions } from "discord.js";
import { DiscordInteraction } from "../types.ts";

import Panel from "../classes/Panel.ts";
import { ItemType } from "@prisma/client";

async function main(interaction: DiscordInteraction) {
    const { client, player } = interaction;

    //get categories
    const items = await client.db.item.findMany({ where: { OR: [{ priceCoin: { not: null } }, { priceGem: { not: null } }] }, orderBy: { id: "asc" } });
    if (!items.length) throw "no items";


    const categories = [...new Set(items.map(i => i.type))]
    const fields = categories.map(c => ({ 
        name: `${items.find(i => i.type === c)?.emoji} {locale_store_categories_${c}_name}`, 
        value: `{locale_store_categories_${c}_description}\n-# ${items.filter(i => i.type === c).length} items`,
        inline: true
    }));

    for (let i = 1; i < fields.length+1; i += 3) fields.splice(i, 0, { name: "\u2800", value: "\u2800", inline: true });
    while (fields.length%3 !== 0) fields.push({ name: '\u2800', value: '\u2800', inline: true });

    return {
        embeds: [ interaction.components.embed({
            author: { name: `${player.user.displayName} - {locale_main_store}`, iconUrl: player.user.displayAvatarURL() },
            description: player.getBalance() + `\n{locale_main_storeText}\n` + `\u2800`.repeat(36),
            fields: fields
        }) ],
        components: [ interaction.components.selectMenu({
            id: 0,
            placeholder: "🛍️\u2800{locale_main_selectCategory}",
            options: categories.map(c => ({ 
                label: `{locale_store_categories_${c}_name}`, 
                description: `{locale_store_categories_${c}_description}`, 
                value: `1:${c}`, 
                hardEmoji: items.find(i => i.type === c)!.emoji!
            })),
            args: { path: "store", page: "main" } 
        }) ]
    }
}

async function category(interaction: DiscordInteraction, category: ItemType, itemId?: number | string, count?: number | string) {
    const { client, player } = interaction;

    if (itemId && typeof itemId === 'string') itemId = parseInt(itemId);
    if (count && typeof count === 'string') count = parseInt(count);

    const items = await client.db.item.findMany({ where: { OR: [{ priceCoin: { not: null } }, { priceGem: { not: null } }], type: category }, orderBy: { id: "asc" } });
    if (!items.length) throw "unknown category";

    const fields = [], data = [];
    for (const item of items) {
        const coinPrice = item.priceCoin ? ((item.discount ? `~~` : `**`) + `{number_${item.priceCoin}}` + (item.discount ? `~~ **{number_${Math.ceil(item.priceCoin!*(1-item.discount!))}}** (-${100*item.discount}%)` : `**`)) : null;
        const gemPrice = item.priceGem ? ((item.discount ? `~~` : `**`) + `{number_${item.priceGem}}` + (item.discount ? `~~ **{number_${Math.ceil(item.priceGem!*(1-item.discount!))}}** (-${100*item.discount}%)` : `**`)) : null;
    
        let desc = [client.formatText(`{locale_items_${item.name}_description}`, interaction.locale, item.properties as object) || "\u2800"];

        if (coinPrice) desc.push(`-# {locale_main_coinPrice}: {emoji_smallCoin} ${coinPrice}`);
        if (gemPrice) desc.push(`-# {locale_main_gemPrice}: {emoji_smallGem} ${gemPrice}`);

        let itemData = {
            ...item,
            name: `{locale_items_${item.name}_name}`,
            desc: desc
        };

        data.push(itemData);

        fields.push({
            name: (itemId === item.id ? `{emoji_chevron_single_right} ` : ``) + `${item.emoji} ${itemData.name}`,
            value: desc.join('\n') + "\n\u2800",
            inline: true
        })
    }

    for (let i = 1; i < fields.length+1; i += 3) fields.splice(i, 0, { name: "\u2800", value: "\u2800", inline: true });
    while (fields.length%3 !== 0) fields.push({ name: '\u2800', value: '\u2800', inline: true });
    
    let components = [ interaction.components.selectMenu({
        id: 0,
        placeholder: "🛍️\u2800{locale_main_selectItem}",
        options: data.map(i => ({ 
            label: `${i.name}`, 
            description: `${i.desc[0]}`, 
            value: `2:${i.id}`, 
            hardEmoji: i.emoji!,
            default: itemId === i.id
        })),
        args: { path: "store", page: category }
    }) ];

    if (itemId) {
        if (!count || typeof count !== 'number') count = 1;
        if (count < 1) count = 1;
        else if (count > 50) count = 50;

        const item = items.find(i => i.id === itemId);
        if (!item) throw "no item";

        const costCoin = Math.ceil((((item.priceCoin||0)*(1-(item.discount||0)))||0)*(count));
        const costGem = Math.ceil((((item.priceGem||0)*(1-(item.discount||0)))||0)*(count));

        const defaults = { id: '0', args: { path: 'store', page: category, itemId: itemId, count: count } };

        const buttons:any = [{
            ...defaults,
            emoji: "minus",
            args: { ...defaults.args, count: count-1 },
            disabled: count === 1
        }, {
            id: '5',
            label: count?.toString(),
            args: { min: 1, max: 50, index: 3, customId: Object.values(defaults.args).join(':') }
        }, {
            ...defaults,
            emoji: "plus",
            args: { ...defaults.args, count: count+1 },
            disabled: count === 50
        }];

        if (item.priceCoin) buttons.push({
            emoji: "smallCoin",
            label: player.data.coins >= costCoin ? `{locale_main_buy} (-{number_${costCoin}})` : `{locale_main_tooExpensive} ({number_${costCoin}})`,
            style: player.data.coins >= costCoin ? "green" : "red",
            disabled: player.data.coins < costCoin,
            id: '4',
            args: { itemId: itemId, count: count, with: 'coins' },
            cooldown: { id: "buy", time: 2 }
        });

        if (item.priceGem) buttons.push({
            emoji: "smallGem",
            label: player.data.gems >= costGem ? `{locale_main_buy} (-{number_${costGem}})` : `{locale_main_tooExpensive} ({number_${costGem}})`,
            style: player.data.gems >= costGem ? "blurple" : "red",
            disabled: player.data.gems < costGem,
            id: '4',
            args: { itemId: itemId, count: count, with: 'gems' },
            cooldown: { id: "buy", time: 2 }
        })

        components = [...components, interaction.components.buttons(buttons)];
    }
    
    return {
        embeds: [ interaction.components.embed({
            author: { name: `${player.user.displayName} - {locale_main_store}`, iconUrl: player.user.displayAvatarURL() },
            description: `${player.getBalance()}\n\n**${items[0].emoji} {locale_store_categories_${category}_name}**\n{locale_store_categories_${category}_description}` + "\n\u2800",
            fields: fields
        }) ],
        components: [...components, interaction.components.buttons([{
            id: '0',
            label: "{locale_main_back}",
            emoji: "back",
            args: { path: 'store', page: 'main' }
        }, {
            id: "0F",
            label: "{locale_main_getMoreGems}",
            emoji: "getGems",
            args: { path: "gems" }
        }])]
    };
}

export default new Panel({
    name: "store",
    async execute(interaction: DiscordInteraction, page: ItemType | string = 'main', itemId?: number | string, count?: number | string): Promise<InteractionReplyOptions> {
        switch (page) {
            case "main": return await main(interaction);
            default: return await category(interaction, page as ItemType, itemId, count);
        }
    }
});