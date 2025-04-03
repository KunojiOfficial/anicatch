import { ItemType } from "@prisma/client";
import { InteractionReplyOptions } from "discord.js";
import { DiscordInteraction } from "../types.ts";
import Panel from "../classes/Panel.ts";

async function main(interaction: DiscordInteraction) {
    const { client, player } = interaction;

    //get categories
    const userData = await client.db.user.findFirst({ where: { id: player.data.id }, include: { moves: { include: { move: true } }, items: { include: { item: true }, orderBy: { itemId: "asc" } } } });
    if (!userData) throw "no user";

    const items = userData.items, moves = userData.moves;
    if (!items.length && !moves.length) throw 23;

    const categories = [...new Set(items.map(i => i.item.type))]
    const counts:any = {};
    for (const item of items) {
        if (!counts[item.item.type]) counts[item.item.type] = 0;
        counts[item.item.type] += item.count;
    }

    for (const move of moves) {
        if (!counts["moves"]) counts["moves"] = 0;
        counts["moves"] += move.count;
    }

    const fields = categories.map(c => ({ 
        name: `${items.find(i => i.item.type === c)?.item.emoji} {locale_store_categories_${c}_name}`, 
        value: `{locale_store_categories_${c}_description}\n-# ${counts[c]} {locale_main_items}`,
        inline: true
    }));
    
    const options:any = categories.map(c => ({ 
        label: `{locale_store_categories_${c}_name}`, 
        description: `{locale_store_categories_${c}_description}`, 
        value: `1:${c}`, 
        hardEmoji: items.find(i => i.item.type === c)!.item.emoji!,
    }));

    if (moves.length) {
        fields.push({
            name: `{emoji_moveItem} {locale_store_categories_MOVES_name}`,
            value: "{locale_store_categories_MOVES_description}\n-# " + `${counts["moves"]} {locale_main_items}`,
            inline: true
        });

        options.push({
            label: `{locale_store_categories_MOVES_name}`,
            description: `{locale_store_categories_MOVES_description}`,
            value: `1:moves`,
            emoji: "moveItem"
        })
    }

    for (let i = 1; i < fields.length+1; i += 3) fields.splice(i, 0, { name: "\u2800", value: "\u2800", inline: true });
    while (fields.length%3 !== 0) fields.push({ name: '\u2800', value: '\u2800', inline: true });

    return {
        embeds: [ interaction.components.embed({
            author: { name: `${player.user.displayName} - {locale_main_inventory}`, iconUrl: player.user.displayAvatarURL() },
            description: player.getBalance() + `\n${player.getEncounters()}\n{locale_main_selectCategoryText}\n` + `\u2800`.repeat(36),
            fields: fields
        }) ],
        components: [ interaction.components.selectMenu({
            id: 0,
            placeholder: "🛍️\u2800{locale_main_selectCategory}",
            options: options,
            args: { path: "inventory", page: "main" },
            cooldown: { id: "use", time: 2 }
        }) ]
    }
}

async function category(interaction: DiscordInteraction, category: ItemType, itemId?: number | string, count?: number | string) {
    const { client, player } = interaction;

    if (itemId && typeof itemId === 'string') itemId = parseInt(itemId);
    if (count && typeof count === 'string') count = parseInt(count);

    const userData = await client.db.user.findFirst({ where: { id: player.data.id }, include: { items: { include: { item: true }, orderBy: { itemId: 'asc' } } } });
    if (!userData) throw "no user";
    
    const items = userData.items.filter(i => i.item.type === category);
    if (!items.length) throw 23;

    const fields = [], data =[];
    for (const item of items) {
        let itemData = {
            ...item,
            name: `{locale_items_${item.item.name}_name}`,
            desc: client.formatText(`{locale_items_${item.item.name}_description}`, interaction.locale, item.item.properties as object)
        };
        data.push(itemData);

        fields.push({
            name: (itemId === item.item.id ? `{emoji_chevron_single_right} ` : ``) + `${item.item.emoji} ${itemData.name}`,
            value: `${itemData.desc}\n-# x${item.count}\n\u2800`,
            inline: true
        })
    }

    for (let i = 1; i < fields.length+1; i += 3) fields.splice(i, 0, { name: "\u2800", value: "\u2800", inline: true });
    while (fields.length%3 !== 0) fields.push({ name: '\u2800', value: '\u2800', inline: true });
    
    let components = [ interaction.components.selectMenu({
        id: 0,
        placeholder: "🛍️\u2800{locale_main_selectItem}",
        options: data.map(i => ({ 
            label: i.name, 
            description: i.desc, 
            value: `2:${i.item.id}`, 
            hardEmoji: i.item.emoji!,
            default: itemId === i.item.id
        })),
        args: { path: "inventory", page: category }
    }) ];

    if (itemId && items.find(i => i.itemId === itemId)?.item.usable) {
        if (!count || typeof count !== 'number') count = 1;
        if (count < 1) count = 1;
        else if (count > 50) count = 50;

        const item = items.find(i => i.item.id === itemId);
        if (!item) throw "no item";

        const defaults = { id: '0', args: { path: 'inventory', page: category, itemId: itemId, count: count } };

        const buttons:any = [{
            ...defaults,
            emoji: "minus",
            args: { ...defaults.args, count: count-1 },
            disabled: count === 1
        }, {
            id: '5',
            label: count?.toString(),
            args: { min: 1, max: item.count, index: 3, customId: Object.values(defaults.args).join(':') },
            disabled: item.count === 1
        }, {
            ...defaults,
            emoji: "plus",
            args: { ...defaults.args, count: count+1 },
            disabled: count === 50 || count === item.count
        }, {
            id: '9',
            emoji: "wyes",
            label: "{locale_main_use}",
            style: "green",
            disabled: !item.item.usable,
            args: { itemId: itemId, count: count }
        }];

        components = [...components, interaction.components.buttons(buttons)];
    }

    return {
        embeds: [ interaction.components.embed({
            author: { name: `${player.user.displayName} - {locale_main_inventory}`, iconUrl: player.user.displayAvatarURL() },
            description: `${player.getBalance()}\n${player.getEncounters()}\n\n**${items[0].item.emoji} {locale_store_categories_${category}_name}**\n{locale_store_categories_${category}_description}` + "\n\u2800",
            fields: fields
        }) ],
        components: [...components, interaction.components.buttons([{
            id: '0',
            label: "{locale_main_back}",
            emoji: "back",
            args: { path: 'inventory', page: 'main' }
        }])]
    };
}

const ON_PAGE = 9;
async function moves(interaction: DiscordInteraction, page: number | string = 1) {
    const { client, player } = interaction;

    if (typeof page === 'string') page = parseInt(page);

    const userData = await client.db.user.findFirst({ where: { id: player.data.id }, include: { moves: { include: { move: true }, orderBy: { moveId: 'desc' } } } });
    if (!userData) throw "no user";

    const moves = userData.moves;
    if (!moves.length) throw 23;

    const movesCount = moves.length;
    const pagesCount = Math.ceil(movesCount / ON_PAGE);
    
    if (page > pagesCount) page = 1;
    if (page < 1) page = pagesCount;

    const slicedMoves = moves.slice((page-1)*ON_PAGE, page*ON_PAGE);
    
    const fields = slicedMoves.map(m => {
        return {
            name: `{emoji_${m.move.type.toLowerCase()}} ${m.move.name}`,
            value: `-# Lv.: ${m.move.requiredLevel} **{locale_main_${m.move.moveType}}**\n-# {locale_main_power}: ${m.move.power} {locale_main_accuracy}: ${m.move.accuracy}\n-# {locale_main_limit} ${m.move.pp} \n-# x${m.count}\n\u2800`,
            inline: true
        }
    });

    return {
        embeds: [ interaction.components.embed({
            author: { name: `${player.user.displayName} - {locale_main_inventory}`, iconUrl: player.user.displayAvatarURL() },
            description: `${player.getBalance()}\n${player.getEncounters()}` + "\n\u2800",
            fields: fields
        }) ],
        components: [ interaction.components.buttons([{
            id: '0',
            label: "{locale_main_back}",
            emoji: "back",
            args: { path: 'inventory', page: 'main' }
        }, {
            id: '0',
            emoji: "chevron_single_left",
            args: { path: 'inventory', page: 'moves', pageIndex: page-1 }
        }, {
            id: '5',
            label: `${page}/${pagesCount}`,
            args: { min: 1, max: pagesCount, index: 2, customId: `inventory:moves:${page}` },
        }, {
            id: '0',
            emoji: "chevron_single_right",
            args: { path: 'inventory', page: 'moves', pageIndex: page+1 },
        }]) ]
    }
}

export default new Panel({
    name: "inventory",
    async execute(interaction: DiscordInteraction, page: ItemType | string = 'main', itemId?: number | string, count?: number | string): Promise<InteractionReplyOptions> {
        switch (page) {
            case "main": return await main(interaction);
            case "moves": return await moves(interaction, itemId);
            default: return await category(interaction, page as ItemType, itemId, count);
        }
    }
});