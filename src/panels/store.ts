import { AttachmentBuilder, InteractionReplyOptions } from "discord.js";
import { DiscordInteraction } from "../types.ts";

import Panel from "../classes/Panel.ts";
import { ItemType } from "@prisma/client";
import { Component } from "../types/componentTypes.ts";
import { resolve } from "path";
import { readFileSync } from "fs";

const bannerImagePath = resolve(__dirname, "../assets/battle/banner2.png");
const bannerImage = readFileSync(bannerImagePath);
const attachment = new AttachmentBuilder(bannerImage, { name: "banner.png" });

const gemSection: Component = { type: "Section", section_data: { components: [
    { type: "TextDisplay", text_display_data: { content: `-# {locale_main_getMoreGemsText}` } },
], accessory: {
    type: "Button",
    button_data: { 
        id: "0F", 
        label: "\u2800{locale_main_getMoreGems}", 
        emoji: "getGems", 
        args: { path: "gems" }
    }
    } } 
}

async function main(interaction: DiscordInteraction): Promise<InteractionReplyOptions> {
    const { client, player } = interaction;
    const isMobile = player.config.isMobile;

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

    const sections: Component[] = categories.map(c => ({
        type: "Section", section_data: {
            components: [
                { type: "TextDisplay", text_display_data: { 
                    content: !isMobile ? 
                    `${items.find(i => i.type === c)?.emoji}\u2800**{locale_store_categories_${c}_name}**\n{emoji_empty}\u2800${client.formatText(`{locale_store_categories_${c}_description}`, interaction.locale).split("\n").join("\n{emoji_empty}\u2800")}\n-# {emoji_empty}\u2800${items.filter(i => i.type === c).length} {locale_main_items}` 
                    : `${items.find(i => i.type === c)?.emoji} **{locale_store_categories_${c}_name}**\n${client.formatText(`{locale_store_categories_${c}_description}`, interaction.locale).replace("\n", "")}` 
                } },
            ], accessory: {
                type: "Button", 
                button_data: { 
                    id: "0", 
                    label: "\u2800{locale_main_select}", 
                    emoji: "whsmallCoin", 
                    args: { path: "store", page: c }
                }
            }
        }
    }));


    return {
        flags: ["IsComponentsV2"],
        files: [attachment],
        components: interaction.componentsV2.construct([{
            type: "Container", components: [
                // { type: "TextDisplay", text_display_data: { content: `-# ${player.user} - {locale_main_store}` } },
                { type: "MediaGallery", media_gallery_data: { items: [ { media: { url: "attachment://banner.png" } } ] } },
                { type: "Separator", separator_data: { divider: false } },
                { type: "Section", section_data: { components: [
                    { type: "TextDisplay", text_display_data: { content: `${player.getBalance()}\n{locale_main_storeText}` } },
                ], accessory: { type: "Button", button_data: { label: "Checkout", emoji: "cart", style: "Primary", id: "69" } } } },
                { type: "Separator", separator_data: { spacing: 2 } },
                ...sections,
                { type: "Separator", separator_data: { spacing: 2 } },
                gemSection
            ],
        }])
    }
}

const MAX_ON_PAGE = 6;

async function category(interaction: DiscordInteraction, category: ItemType, itemId?: number | string, count?: number | string): Promise<InteractionReplyOptions> {
    const { client, player } = interaction;

    if (itemId && typeof itemId === 'string') itemId = parseInt(itemId);
    if (count && typeof count === 'string') count = parseInt(count);

    const items = await client.db.item.findMany({ where: { OR: [{ priceCoin: { not: null } }, { priceGem: { not: null } }], type: category }, orderBy: { id: "asc" } });
    if (!items.length) throw "unknown category";

    const itemsOnPage = items.slice(0, MAX_ON_PAGE);

    const sections: Component[] = []
    for (const item of itemsOnPage) {
        const coinPrice = item.priceCoin ? ((item.discount ? `~~` : `**`) + `{number_${item.priceCoin}}` + (item.discount ? `~~ **{number_${Math.ceil(item.priceCoin!*(1-item.discount!))}}** (-${100*item.discount}%)` : `**`)) : null;
        const gemPrice = item.priceGem ? ((item.discount ? `~~` : `**`) + `{number_${item.priceGem}}` + (item.discount ? `~~ **{number_${Math.ceil(item.priceGem!*(1-item.discount!))}}** (-${100*item.discount}%)` : `**`)) : null;

        let text = [client.formatText(`{locale_items_${item.name}_description}`, interaction.locale, item.properties as object) || "\u2800"];
        if (coinPrice) text.push(`-# {locale_main_coinPrice}: {emoji_smallCoin} ${coinPrice}`);
        if (gemPrice) text.push(`-# {locale_main_gemPrice}: {emoji_smallGem} ${gemPrice}`);

        sections.push({ type: "Section", section_data: {
            components: [
                { type: "TextDisplay", text_display_data: { content: `${item.emoji} **{locale_items_${item.name}_name}**\n${text.join('\n')}` } }
            ], accessory: {
                type: "Button", button_data: { id: Math.random().toString(), emoji: "cart", args: { path: "store", page: category, itemId: item.id } }
            }
        } });
    }

    // if (itemId) {
    //     if (!count || typeof count !== 'number') count = 1;
    //     if (count < 1) count = 1;
    //     else if (count > 50) count = 50;

    //     const item = items.find(i => i.id === itemId);
    //     if (!item) throw "no item";

    //     const costCoin = Math.ceil((((item.priceCoin||0)*(1-(item.discount||0)))||0)*(count));
    //     const costGem = Math.ceil((((item.priceGem||0)*(1-(item.discount||0)))||0)*(count));

    //     const defaults = { id: '0', args: { path: 'store', page: category, itemId: itemId, count: count } };

    //     const buttons:any = [{
    //         ...defaults,
    //         emoji: "minus",
    //         args: { ...defaults.args, count: count-1 },
    //         disabled: count === 1
    //     }, {
    //         id: '5',
    //         label: count?.toString(),
    //         args: { min: 1, max: 50, index: 3, customId: Object.values(defaults.args).join(':') }
    //     }, {
    //         ...defaults,
    //         emoji: "plus",
    //         args: { ...defaults.args, count: count+1 },
    //         disabled: count === 50
    //     }];

    //     if (item.priceCoin) buttons.push({
    //         emoji: "smallCoin",
    //         label: player.data.coins >= costCoin ? `{locale_main_buy} (-{number_${costCoin}})` : `{locale_main_tooExpensive} ({number_${costCoin}})`,
    //         style: player.data.coins >= costCoin ? "green" : "red",
    //         disabled: player.data.coins < costCoin,
    //         id: '4',
    //         args: { itemId: itemId, count: count, with: 'coins' },
    //         cooldown: { id: "buy", time: 2 }
    //     });

    //     if (item.priceGem) buttons.push({
    //         emoji: "smallGem",
    //         label: player.data.gems >= costGem ? `{locale_main_buy} (-{number_${costGem}})` : `{locale_main_tooExpensive} ({number_${costGem}})`,
    //         style: player.data.gems >= costGem ? "blurple" : "red",
    //         disabled: player.data.gems < costGem,
    //         id: '4',
    //         args: { itemId: itemId, count: count, with: 'gems' },
    //         cooldown: { id: "buy", time: 2 }
    //     })

    //     components = [...components, interaction.components.buttons(buttons)];
    // }    

    return {
        flags: ["IsComponentsV2"],
        files: [attachment],
        components: interaction.componentsV2.construct([{
            type: "Container", components: [
                { type: "TextDisplay", text_display_data: { content: `-# ${player.user} - {locale_main_store}` } },
                { type: "Separator" },
                { type: "Section", section_data: { components: [
                    { type: "TextDisplay", text_display_data: { content: `${player.getBalance()}` } },
                ], accessory: { type: "Button", button_data: { label: "Checkout", emoji: "cart", style: "Primary", id: "69" } } } },
                { type: "Separator", separator_data: { spacing: 2 } },
                { type: "Section", section_data: { components: [
                    { type: "TextDisplay", text_display_data: { content: `${items[0].emoji} **{locale_store_categories_${category}_name}**\n${client.formatText(`{locale_store_categories_${category}_description}`, interaction.locale)}` } }
                ], accessory: { type: "Button", button_data: { id: "0", label: "{locale_main_back}", emoji: "back", args: { path: "store", page: "main" } } } } },
                { type: "Separator", separator_data: { spacing: 2 } },
                // { type: "Section", section_data: { components: [
                //     { type: "TextDisplay", text_display_data: { content: `{emoji_empty}` } }
                // ], accessory: { type: "Button", button_data: { label: "x1", id: "693" } } } },
                ...sections,
                { type: "Separator", separator_data: { spacing: 2, divider: false } },
                { type: "ActionRow", components: [
                    { type: "Button", button_data: { id: Math.random().toString(), emoji: "chevron_single_left" } },
                    { type: "Button", button_data: { id: "sds", label: `1/2` } },
                    { type: "Button", button_data: { id: Math.random().toString(), emoji: "chevron_single_right" } },
                ] },
                { type: "Separator", separator_data: { spacing: 2 } },
                gemSection
            ]
        }])
    }
    
    // return {
    //     embeds: [ interaction.components.embed({
    //         author: { name: `${player.user.displayName} - {locale_main_store}`, iconUrl: player.user.displayAvatarURL() },
    //         description: `${player.getBalance()}\n\n**${items[0].emoji} {locale_store_categories_${category}_name}**\n{locale_store_categories_${category}_description}` + "\n\u2800",
    //         fields: fields
    //     }) ],
    //     components: [...components, interaction.components.buttons([{
    //         id: '0',
    //         label: "{locale_main_back}",
    //         emoji: "back",
    //         args: { path: 'store', page: 'main' }
    //     }, {
    //         id: "0F",
    //         label: "{locale_main_getMoreGems}",
    //         emoji: "getGems",
    //         args: { path: "gems" }
    //     }])]
    // };
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