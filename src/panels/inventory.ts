import { ItemType } from "@prisma/client";
import { InteractionReplyOptions } from "discord.js";
import { DiscordInteraction } from "../types.ts";
import Panel from "../classes/Panel.ts";
import { Component } from "../types/componentTypes.ts";

async function main(interaction: DiscordInteraction) {
    const { client, player } = interaction;
    const isMobile = player.config.isMobile;

    //get categories
    const userData = await client.db.user.findFirst({ where: { id: player.data.id }, include: { moves: { include: { move: true } }, items: { include: { item: true }, orderBy: { itemId: "asc" } } } });
    if (!userData) throw "no user";

    const items = userData.items, moves = userData.moves;
    if (!items.length && !moves.length) throw 23;

    const categories = [...new Set(items.map(i => i.item.type))];
    if (moves.length) categories.push("MOVES" as any);

    const sections: Component[] = categories.map(c => ({
        type: "Section", section_data: {
            components: [
                { type: "TextDisplay", text_display_data: { 
                    content: !isMobile ? 
                    `${items.find(i => i.item.type === c)?.item.emoji || "{emoji_move}"}\u2800**{locale_store_categories_${c}_name}**\n{emoji_empty}\u2800${client.formatText(`{locale_store_categories_${c}_description}`, interaction.locale).split("\n").join("\n{emoji_empty}\u2800")}` 
                    : `${items.find(i => i.item.type === c)?.item.emoji || "{emoji_move}"} **{locale_store_categories_${c}_name}**\n${client.formatText(`{locale_store_categories_${c}_description}`, interaction.locale).replace("\n", "")}` 
                } },
            ], accessory: {
                type: "Button", 
                button_data: { 
                    id: "0", 
                    emoji: "chevron_single_right", 
                    args: { path: "inventory", page: c }
                }
            }
        }
    }));

    return {
        flags: ["IsComponentsV2"],
        components: interaction.componentsV2.construct([{
            type: "Container", components: [
                { type: "TextDisplay", text_display_data: { content: `-# ${player.user} - {locale_main_inventory}` } },
                { type: "Separator" },
                { type: "TextDisplay", text_display_data: { content: `${player.getBalance()}\n${player.getEncounters()}\n{locale_main_selectCategoryText}` } },
                { type: "Separator", separator_data: { spacing: 2 } },
                ...sections,
                !isMobile ? { type: "TextDisplay", text_display_data: { content: "\u2800".repeat(62) } } : null
            ],
        }])
    }
}

const MAX_ON_PAGE = 6;

async function category(interaction: DiscordInteraction, category: ItemType | "MOVES", page: number | string = 1, itemId?: number | string, count?: number | string): Promise<InteractionReplyOptions> {
    const { client, player } = interaction;
    const isMobile = player.config.isMobile;

    if (typeof page === 'string') page = parseInt(page);
    if (itemId && typeof itemId === 'string') itemId = parseInt(itemId);
    if (count && typeof count === 'string') count = parseInt(count);

    const userData: any = category !== "MOVES" ? await client.db.user.findFirst({ where: { id: player.data.id }, include: { items: { where: { item: { type: category } }, include: { item: true }, orderBy: { itemId: 'asc' } } } }) :
                                                 await client.db.user.findFirst({ where: { id: player.data.id }, include: { moves: { include: { move: true }, orderBy: { moveId: 'desc' } } } });
    if (!userData) throw "no user";

    const items = userData.items || userData.moves.map(m => ({ what: "move", itemId: m.moveId, count: m.count, item: { name: m.move.name, emoji: `{emoji_${m.move.type.toLowerCase()}}`, properties: m.move, usable: false } }));
    if (!items.length) throw 23;

    const pageCount = Math.ceil(items.length / MAX_ON_PAGE);

    if (!page) page = 1;
    if (page < 1) page = pageCount;
    else if (page > pageCount) page = 1;

    const itemsOnPage = itemId ? items : items.slice((page-1) * MAX_ON_PAGE, page * MAX_ON_PAGE);
    
    if (!count || typeof count !== 'number') count = 1;
    if (count < 1) count = 1;
    else if (count > 50) count = 50;

    const defaults = { id: '0', args: { path: 'inventory', page: category, pagination: page, itemId: itemId, count: count } };

    let singleUse = false;
    const sections: Component[] = [];
    for (const item of itemsOnPage) {
        if (itemId && item.itemId !== itemId) continue;
        const isSelected = itemId && itemId === item.itemId;
        if (isSelected && item.item?.singleUse) singleUse = true;

        let text = [client.formatText(item.what === "move" ? `{locale_items_move_description}` : `{locale_items_${item.item.name}_description}`, interaction.locale, item.item.properties as object) || "\u2800"];
        

        sections.push({ type: "Section", section_data: {
            components: [
                { type: "TextDisplay", text_display_data: { content: `${item.item.emoji} ${item.what === "move" ? `**${item.item.name}**` : `**{locale_items_${item.item.name}_name}**`} ({number_${item.count}})\n${text.join('\n')}` } }
            ], accessory: {
                type: "Button", button_data: { ...defaults, emoji: !isSelected ? "chevron_single_down" : "chevron_single_up", args: { ...defaults.args, itemId: !isSelected ? item.itemId : 0 }, disabled: !item.item.usable }
            }
        } });
    }

    return {
        flags: ["IsComponentsV2"],
        components: interaction.componentsV2.construct([{
            type: "Container", components: [
                { type: "TextDisplay", text_display_data: { content: `-# ${player.user} - {locale_main_inventory}` } },
                { type: "Separator" },
                { type: "TextDisplay", text_display_data: { content: `${player.getBalance()}` } },
                { type: "Separator", separator_data: { spacing: 2 } },
                { type: "Section", section_data: { components: [
                    { type: "TextDisplay", text_display_data: { content: `${items[0].item.emoji} **{locale_store_categories_${category}_name}**\n${client.formatText(`{locale_store_categories_${category}_description}`, interaction.locale)}` } }
                ], accessory: { type: "Button", button_data: { id: "0", label: "{locale_main_back}", emoji: "back", args: { path: "inventory", page: "main" } } } } },
                { type: "Separator", separator_data: { spacing: 2 } },
                ...sections,
                pageCount > 1 && !itemId ? { type: "ActionRow", components: [
                    { type: "Button", button_data: { ...defaults, emoji: "chevron_single_left", args: { ...defaults.args, pagination: page-1 } } },
                    { type: "Button", button_data: { ...defaults, id: "5", args: { min: 1, max: pageCount, index: 2, customId: Object.values(defaults.args).join(':') }, label: `\u2800{locale_main_page}\u2800${page} / ${pageCount}\u2800` } },
                    { type: "Button", button_data: { ...defaults, emoji: "chevron_single_right", args: { ...defaults.args, pagination: page+1 } } },
                ] } : null,
                itemId ? { type: "Separator", separator_data: { spacing: 2, divider: false } } : null,
                itemId ?  { type: "ActionRow", components: [
                    !singleUse ? { type: "Button", button_data: { ...defaults, emoji: "minus", args: { ...defaults.args, count: count-1 }, disabled: count == 1 } } : null,
                    !singleUse ? { type: "Button", button_data: { id: '5', label: count?.toString(), args: { min: 1, max: Math.min(50), index: 4, customId: Object.values(defaults.args).join(':') } } } : null,
                    !singleUse ? { type: "Button", button_data: { ...defaults, emoji: "plus", args: { ...defaults.args, count: count+1 }, disabled: count == 50 } } : null,
                    { type: "Button", button_data: { 
                        id: '9',
                        emoji: "wyes",
                        label: "{locale_main_use}",
                        style: "Success",
                        args: { itemId: itemId, count: singleUse ? 1 : count },
                        cooldown: { id: "use", time: 2 }
                     } }
                ] } : null,
                !isMobile ? { type: "TextDisplay", text_display_data: { content: "\u2800".repeat(62) } } : null
            ]
        }])
    }
}

export default new Panel({
    name: "inventory",
    async execute(interaction: DiscordInteraction, page: ItemType | string = 'main', pagination: number | string = 1, itemId?: number | string, count?: number | string): Promise<InteractionReplyOptions> {
        switch (page) {
            case "main": return await main(interaction) as any;
            // case "MOVES": return await moves(interaction, itemId);
            default: return await category(interaction, page as ItemType, pagination, itemId, count);
        }
    }
});