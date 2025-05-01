import { InteractionReplyOptions, User } from "discord.js";
import { DiscordInteraction } from "../types.ts";
import Panel from "../classes/Panel.ts";

const PER_PAGE = 12;

import rarities from "../data/rarities.json";
import types from "../data/types.json";
import Rarity from "../classes/Rarity.ts";

export default new Panel({
    name: "collection",
    async execute(interaction: DiscordInteraction, page: number | string = 1, owner: User): Promise<InteractionReplyOptions> {
        const { player, client } = interaction;
        
        if (typeof page === 'string') page = parseInt(page);
        if (typeof owner === 'string' && owner !== '0') owner = await client.users.fetch(owner);

        if (!owner || typeof owner === 'string') owner = player.user;

        const userData = await client.db.user.findFirst({ 
            where: { discordId: owner.id }, 
            include: { 
                cards: { 
                    where: { status: { in: ["IDLE", "FIGHT", "DEAD", "TRADE"] } }, 
                    orderBy: [ { favorite: 'desc' }, { rarity: 'desc' } ], 
                    include: { card: { include: { character: true } } }
                },
                role: true
            } 
        });

        if (!userData) throw 7; //user not registered

        const cards = userData.cards;
        const pageCount = Math.ceil(cards.length/PER_PAGE);
        
        if (page < 1) page = pageCount;
        else if (page > pageCount) page = 1;
        
        const pageCards = cards.slice((page-1)*PER_PAGE, page*PER_PAGE);
        
        //get ballIcons
        const ballData = await client.db.item.findMany({ where: { type: "BALL" } });
        
        const fields = [], options = [];
        for (const c of pageCards) {
            const type = types[c.card.type.toString() as keyof typeof types];
            const rarity = rarities[c.rarity.toString() as keyof typeof rarities];
            const ball = ballData.find(b => b.id === c.ballId);
            const id = client.getId(c.cardId, c.print);

            const rarityInstance = new Rarity(c.rarity);

            fields.push({
                name: `${(ball?.emoji + " ") || "{emoji_empty}"}${c.card.character.name}`,
                value: `\`${id.padEnd(7, " ")}\`{emoji_${type.name.toLowerCase()}}${c.favorite ? "{emoji_favorite}":""}\n${rarityInstance.getLongEmoji()}\n\u2800`,
                inline: true
            });

            options.push({
                label: c.card.character.name,
                hardEmoji: ball?.emoji || "",
                description: `${id}\u2800|\u2800${rarity.name}`,
                value: `1:${c.id.toString()}`
            });
        }

        const defaults = { id: '0', args: { path: "collection", page: page, owner: owner.id === player.user.id ? '0' : owner.id } };

        while (fields.length%3 !== 0) fields.push({ name: "\u2800", value: "\u2800", inline: true });

        const components = [ interaction.components.buttons([{
            ...defaults,
            emoji: "chevron.double.left",
            args: { ...defaults.args, page: pageCount + 5 },
            disabled: pageCount <= 1
        }, {
            ...defaults,
            emoji: "chevron.single.left",
            args: { ...defaults.args, page: page - 1 },
            disabled: pageCount <= 1
        }, {
            id: '5',
            label: `\u2800` + `{locale_main_page} ${page} / ${pageCount}` + `\u2800`,
            disabled: pageCount <= 1,
            args: { min: 1, max: pageCount, index: 1, customId: Object.values(defaults.args).join(':') }
        }, {
            ...defaults,
            emoji: "chevron.single.right",
            args: { ...defaults.args, page: page + 1 },
            disabled: pageCount <= 1
        }, {
            ...defaults,
            emoji: "chevron.double.right",
            args: { ...defaults.args, page: -5 },
            disabled: pageCount <= 1
        }]) ];

        if (fields.length) components.unshift(interaction.components.selectMenu({
            id: 0,
            followUp: true,
            options: options.length ? options : [ { label: "test", value: "test" } ],
            placeholder: `💿\u2800{locale_main_selectAnimon}`,
            args: { path: "animon" }
        }))

        return {
            embeds: [ interaction.components.embed({
                author: { name: `{locale_main_collection}`, iconUrl: owner.displayAvatarURL() },
                description: (userData.roleId>1?`### ${userData.role.name}\u2800${userData.role.emoji||""}\n\n`:``) + `**{locale_main_sortBy}:** {locale_main_rarityDesc}\n-# {locale_main_collectionTip}\n` + "\u2800".repeat(47),
                fields: fields,
                color: (userData.roleId>1&&userData.role.color) ? userData.role.color : undefined
            }, {
                owner: [`${owner.displayName}`]
            }) ],
            components: components
        }
    }
});