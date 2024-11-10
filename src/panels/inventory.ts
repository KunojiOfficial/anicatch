import { disableValidators, InteractionReplyOptions } from "discord.js";
import { DiscordInteraction } from "../types";
import Panel from "../classes/Panel";
import { ItemType } from "@prisma/client";

async function main(interaction: DiscordInteraction) {
    const { client, player } = interaction;

    //get categories
    const userData = await client.db.user.findFirst({ where: { id: player.data.id }, include: { items: { include: { item: true }, orderBy: { itemId: "asc" } } } });
    if (!userData) throw "no user";
    
    const items = userData.items;
    if (!items.length) throw 23;

    const categories = [...new Set(items.map(i => i.item.type))]
    const counts:any = {};
    for (const item of items) {
        if (!counts[item.item.type]) counts[item.item.type] = 0;
        counts[item.item.type] += item.count;
    }

    const fields = categories.map(c => ({ 
        name: `${items.find(i => i.item.type === c)?.item.emoji} {locale_store_categories_${c}_name}`, 
        value: `{locale_store_categories_${c}_description}\n-# ${counts[c]} items`,
        inline: true
    }));

    for (let i = 1; i < fields.length+1; i += 3) fields.splice(i, 0, { name: "\u2800", value: "\u2800", inline: true });
    while (fields.length%3 !== 0) fields.push({ name: '\u2800', value: '\u2800', inline: true });

    return {
        embeds: [ interaction.components.embed({
            author: { name: `${player.user.displayName} - Inventory`, iconUrl: player.user.displayAvatarURL() },
            description: player.getBalance() + `\n${player.getEncounters()}\nSelect a category of the items you would like to view.\n` + `\u2800`.repeat(36),
            fields: fields
        }) ],
        components: [ interaction.components.selectMenu({
            id: 0,
            placeholder: "🛍️\u2800Select a category!",
            options: categories.map(c => ({ 
                label: `{locale_store_categories_${c}_name}`, 
                description: `{locale_store_categories_${c}_description}`, 
                value: `1:${c}`, 
                hardEmoji: items.find(i => i.item.type === c)!.item.emoji!
            })),
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

    const fields = [];
    for (const item of items) {

        fields.push({
            name: (itemId === item.item.id ? `{emoji_chevron_single_right} ` : ``) + `${item.item.emoji} ${item.item.name}`,
            value: `${item.item.description}\n-# x${item.count}\n\u2800`,
            inline: true
        })
    }

    for (let i = 1; i < fields.length+1; i += 3) fields.splice(i, 0, { name: "\u2800", value: "\u2800", inline: true });
    while (fields.length%3 !== 0) fields.push({ name: '\u2800', value: '\u2800', inline: true });
    
    let components = [ interaction.components.selectMenu({
        id: 0,
        placeholder: "🛍️\u2800Select an item!",
        options: items.map(i => ({ 
            label: `${i.item.name}`, 
            description: `${i.item.description}`, 
            value: `2:${i.item.id}`, 
            hardEmoji: i.item.emoji!,
            default: itemId === i.item.id
        })),
        args: { path: "inventory", page: category }
    }) ];

    if (itemId) {
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
            label: "Use",
            style: "green",
            disabled: !item.item.usable,
            args: { itemId: itemId, count: count }
        }];

        components = [...components, interaction.components.buttons(buttons)];
    }

    return {
        embeds: [ interaction.components.embed({
            author: { name: `${player.user.displayName} - Inventory`, iconUrl: player.user.displayAvatarURL() },
            description: `${player.getBalance()}\n${player.getEncounters()}\n\n**${items[0].item.emoji} {locale_store_categories_${category}_name}**\n{locale_store_categories_${category}_description}` + "\n\u2800",
            fields: fields
        }) ],
        components: [...components, interaction.components.buttons([{
            id: '0',
            label: "Back",
            emoji: "back",
            args: { path: 'inventory', page: 'main' }
        }])]
    };
}

export default new Panel({
    name: "inventory",
    async execute(interaction: DiscordInteraction, page: ItemType | string = 'main', itemId?: number | string, count?: number | string): Promise<InteractionReplyOptions> {
        switch (page) {
            case "main": return await main(interaction);
            default: return await category(interaction, page as ItemType, itemId, count);
        }
    }
});