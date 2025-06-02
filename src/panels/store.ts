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

    const sections: Component[] = categories.map(c => ({
        type: "Section", section_data: {
            components: [
                { type: "TextDisplay", text_display_data: { 
                    content: !isMobile ? 
                    `${items.find(i => i.type === c)?.emoji}\u2800**{locale_store_categories_${c}_name}**\n{emoji_empty}\u2800${client.formatText(`{locale_store_categories_${c}_description}`, interaction.locale).split("\n").join("\n{emoji_empty}\u2800")}` 
                    : `${items.find(i => i.type === c)?.emoji} **{locale_store_categories_${c}_name}**\n${client.formatText(`{locale_store_categories_${c}_description}`, interaction.locale).replace("\n", "")}` 
                } },
            ], accessory: {
                type: "Button", 
                button_data: { 
                    id: "0", 
                    emoji: "chevron_single_right", 
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
                { type: "MediaGallery", media_gallery_data: { items: [ { media: { url: "attachment://banner.png" } } ] } },
                { type: "Separator", separator_data: { divider: false } },
                { type: "TextDisplay", text_display_data: { content: `${player.getBalance()}\n{locale_main_storeText}` } },
                { type: "Separator", separator_data: { spacing: 2 } },
                ...sections,
                { type: "Separator", separator_data: { spacing: 2 } },
                gemSection
            ],
        }])
    }
}

const MAX_ON_PAGE = 5;

async function category(interaction: DiscordInteraction, category: ItemType, page: number | string = 1, itemId?: number | string, count?: number | string): Promise<InteractionReplyOptions> {
    const { client, player } = interaction;

    if (typeof page === 'string') page = parseInt(page);
    if (itemId && typeof itemId === 'string') itemId = parseInt(itemId);
    if (count && typeof count === 'string') count = parseInt(count);

    const items = await client.db.item.findMany({ where: { OR: [{ priceCoin: { not: null } }, { priceGem: { not: null } }], type: category }, orderBy: { id: "asc" } });
    if (!items.length) throw "unknown category";

    const pageCount = Math.ceil(items.length / MAX_ON_PAGE);

    if (page === undefined) page = 1;
    if (page < 1) page = pageCount;
    else if (page > pageCount) page = 1;

    const itemsOnPage = itemId ? items : items.slice((page-1) * MAX_ON_PAGE, page * MAX_ON_PAGE);
    
    if (!count || typeof count !== 'number') count = 1;
    if (count < 1) count = 1;
    else if (count > 50) count = 50;

    const defaults = { id: '0', args: { path: 'store', page: category, pagination: page, itemId: itemId, count: count } };

    let costCoin = 0, costGem = 0;
    const sections: Component[] = [];
    for (const item of itemsOnPage) {
        if (itemId && item.id !== itemId) continue;
        const coinPrice = item.priceCoin ? ((item.discount ? `~~` : `**`) + `{number_${item.priceCoin}}` + (item.discount ? `~~ **{number_${Math.ceil(item.priceCoin!*(1-item.discount!))}}** (-${100*item.discount}%)` : `**`)) : null;
        const gemPrice = item.priceGem ? ((item.discount ? `~~` : `**`) + `{number_${item.priceGem}}` + (item.discount ? `~~ **{number_${Math.ceil(item.priceGem!*(1-item.discount!))}}** (-${100*item.discount}%)` : `**`)) : null;

        const isSelected = itemId && item.id === itemId;

        let prices = [];
        if (coinPrice) prices.push(`{emoji_smallCoin}${coinPrice}`);
        if (gemPrice) prices.push(`{emoji_smallGem}${gemPrice}`);
        
        let text = [client.formatText(`{locale_items_${item.name}_description}`, interaction.locale, item.properties as object) || "\u2800", `-# {locale_main_price}: ${prices.join(' / ')}`];

        if (isSelected) {
            costCoin = Math.ceil((((item.priceCoin||0)*(1-(item.discount||0)))||0)*(count));
            costGem = Math.ceil((((item.priceGem||0)*(1-(item.discount||0)))||0)*(count));
        }

        sections.push({ type: "Section", section_data: {
            components: [
                { type: "TextDisplay", text_display_data: { content: `${item.emoji} **{locale_items_${item.name}_name}**\n${text.join('\n')}` } }
            ], accessory: {
                type: "Button", button_data: { ...defaults, emoji: !isSelected ? "chevron_single_down" : "chevron_single_up", args: { ...defaults.args, itemId: !isSelected ? item.id : 0 } }
            }
        } });
    }

    return {
        flags: ["IsComponentsV2"],
        components: interaction.componentsV2.construct([{
            type: "Container", components: [
                { type: "TextDisplay", text_display_data: { content: `-# ${player.user} - {locale_main_store}` } },
                { type: "Separator" },
                { type: "TextDisplay", text_display_data: { content: `${player.getBalance()}` } },
                { type: "Separator", separator_data: { spacing: 2 } },
                { type: "Section", section_data: { components: [
                    { type: "TextDisplay", text_display_data: { content: `${items[0].emoji} **{locale_store_categories_${category}_name}**\n${client.formatText(`{locale_store_categories_${category}_description}`, interaction.locale)}` } }
                ], accessory: { type: "Button", button_data: { id: "0", label: "{locale_main_back}", emoji: "back", args: { path: "store", page: "main" } } } } },
                { type: "Separator", separator_data: { spacing: 2 } },
                ...sections,
                { type: "Separator", separator_data: { spacing: 2, divider: false } },
                pageCount > 1 && !itemId ? { type: "ActionRow", components: [
                    { type: "Button", button_data: { ...defaults, emoji: "chevron_single_left", args: { ...defaults.args, pagination: page-1 } } },
                    { type: "Button", button_data: { ...defaults, id: "5", args: { min: 1, max: pageCount, index: 2, customId: Object.values(defaults.args).join(':') }, label: `\u2800{locale_main_page}\u2800${page} / ${pageCount}\u2800` } },
                    { type: "Button", button_data: { ...defaults, emoji: "chevron_single_right", args: { ...defaults.args, pagination: page+1 } } },
                ] } : null,
                itemId ?  { type: "ActionRow", components: [
                    { type: "Button", button_data: { ...defaults, emoji: "minus", args: { ...defaults.args, count: count-1 }, disabled: count == 1 } },
                    { type: "Button", button_data: { id: '5', label: count?.toString(), args: { min: 1, max: 50, index: 4, customId: Object.values(defaults.args).join(':') } } },
                    { type: "Button", button_data: { ...defaults, emoji: "plus", args: { ...defaults.args, count: count+1 }, disabled: count == 50 } },

                ] } : null,
                itemId ? { type: "ActionRow", components: [
                    costCoin>0?{ type: "Button", button_data: {
                        emoji: "smallCoin",
                        label: player.data.coins >= costCoin ? `{locale_main_buy} (-{number_${costCoin}})` : `{locale_main_tooExpensive} ({number_${costCoin}})`,
                        style: player.data.coins >= costCoin ? "Success" : "Danger",
                        disabled: player.data.coins < costCoin,
                        id: '4',
                        args: { itemId: itemId, count: count, with: 'coins' },
                        cooldown: { id: "buy", time: 2 }
                    } }: null,
                    costGem>0?{ type: "Button", button_data: {
                        emoji: "smallGem",
                        label: player.data.gems >= costGem ? `{locale_main_buy} (-{number_${costGem}})` : `{locale_main_tooExpensive} ({number_${costGem}})`,
                        style: player.data.gems >= costGem ? "Primary" : "Danger",
                        disabled: player.data.gems < costGem,
                        id: '4',
                        args: { itemId: itemId, count: count, with: 'gems' },
                        cooldown: { id: "buy", time: 2 }
                    } }:null
                ] } : null,
                { type: "Separator", separator_data: { spacing: 2 } },
                gemSection
            ]
        }])
    }
}

export default new Panel({
    name: "store",
    async execute(interaction: DiscordInteraction, page: ItemType | string = 'main', pagination?: number | string, itemId?: number | string, count?: number | string): Promise<InteractionReplyOptions> {
        switch (page) {
            case "main": return await main(interaction);
            default: return await category(interaction, page as ItemType, pagination, itemId, count);
        }
    }
});