import { InteractionReplyOptions, User } from "discord.js";
import { DiscordInteraction } from "../types.ts";
import Panel from "../classes/Panel.ts";

const PER_PAGE = 7;

import { Component } from "../types/componentTypes.ts";
import Card from "../classes/Card.ts";

const sortKeys = ["rarity", "level", "print", "nameCard"];
const sortOrderKeys = [ "rarity", "exp", "print", "name" ];
let ballData;

export default new Panel({
    name: "collection",
    async execute(interaction: DiscordInteraction, page: number | string = 1, owner: User, sortBy: string = "1000", search?: string): Promise<InteractionReplyOptions> {
        const { player, client } = interaction;
        
        if (typeof page === 'string') page = parseInt(page);
        if (typeof owner === 'string' && owner !== '0') owner = await client.users.fetch(owner);

        if (!owner || typeof owner === 'string') owner = player.user;

        const sortData = sortBy.split("").map(s => parseInt(s));
        const orderBy: any = [{ favorite: "desc" }];

        for (let i = 0; i < sortData.length; i++) {
            if (sortData[i] === 0) continue;
            if (sortOrderKeys[i] === "name") {
                orderBy.push({ card: { character: { name: sortData[i] === 1 ? "desc" : "asc" } } });
                continue;
            } else if (sortOrderKeys[i] === "rarity") {
                orderBy.push({ rarity: sortData[i] === 1 ? "desc" : "asc" });
                orderBy.push({ ascension: sortData[i] === 1 ? "desc" : "asc" });
                continue;
            }

            orderBy.push({ [sortOrderKeys[i]]: sortData[i] === 1 ? "desc" : "asc" });
        }

        const where = { status: { in: ["IDLE", "FIGHT", "DEAD", "TRADE"] } };
        if (search) where["card"] = { character: { name: { contains: search, mode: "insensitive" } } };

        const userData = await client.db.user.findFirst({ 
            where: { discordId: owner.id }, 
            include: { 
                cards: { 
                    where: where as any, 
                    orderBy: orderBy, 
                    include: { card: { include: { character: true } } }
                },
                role: true
            } 
        });

        if (!userData) throw 7; //user not registered
        if (!ballData) ballData = await client.db.item.findMany({ where: { type: "BALL" } });

        const cards = userData.cards;
        const pageCount = Math.ceil(cards.length/PER_PAGE);
        
        if (page < 1) page = pageCount;
        else if (page > pageCount) page = 1;
        
        const pageCards = cards.slice((page-1)*PER_PAGE, page*PER_PAGE);
        
        const sortButtons: Component[] = sortKeys.map((key, i) => {
            let value = sortData[i];
            return {
                type: "Button", button_data: {
                    label: `{locale_main_${key}}`,
                    emoji: value === 0 ? "sosrtNo" : value === 1 ? "sort" : "sortRev",
                    id: "0",
                    args: { path: "collection", page: page, owner: owner.id === player.user.id ? '0' : owner.id, sortBy: sortData.map((s, j) => (i === j ? (s === 0 ? 1 : s === 1 ? 2 : 0) : s)).join(""), search: search }
                }
            }
        })

        const sections: Component[] = [];
        for (const data of pageCards) {
            const card = new Card({ card: data, parent: data.card, character: data.card.character, ball: ballData.find(b => b.id === data.ballId) });
            
            const level = `\`Lv. ${card.level.toString().padEnd(2, " ")}\``
            const rarity = card.rarityInstance.getLongEmoji();
            const type = `{emoji_${card.type.name.toLowerCase()}}`;
            const favorite = card.card.favorite ? "{emoji_favorite}" : "";

            sections.push({
                type: "Section", section_data: { components: [
                    { type: "TextDisplay", text_display_data: { 
                        content: !player.config.isMobile ? 
                              `${card.ball.emoji}\u2800\`${card.id.padEnd(7, " ")}\`\u2800${rarity}\u2800**${level}**\u2800${type}\u2800**${card.name}** ${favorite}`
                            : `${card.ball.emoji}\u2800\`${card.id}\`\u2800**${card.name}** ${favorite}\n${type}\u2800${level} ${rarity}`
                        } }
                ], accessory: { type: "Button", button_data: {
                    id: "0F",
                    emoji: "links",
                    args: { path: "animon", id: card.numericId, userAccess: false },
                } } }
            })
        }

        if (interaction.message && (!interaction.message.flags || !interaction.message.flags.has("IsComponentsV2"))) return {};
        
        const defaults = { id: '0', args: { path: "collection", page: page, owner: owner.id === player.user.id ? '0' : owner.id, sortBy: sortBy, search: search }, disabled: pageCount <= 1 };

        return {
            flags: [ "IsComponentsV2" ],
            components: interaction.componentsV2.construct([{
                type: "Container", container_data: { color: (userData.roleId>1&&userData.role.color) ? userData.role.color : undefined }, components: [
                    { type: "TextDisplay", text_display_data: { content: `-# ${player.user} - **{locale_main_collection}**` } },
                    { type: "Separator" },
                    { type: "TextDisplay", text_display_data: { content: (userData.roleId>1 ?`### ${userData.role.name}\u2800${userData.role.emoji||""}\n` : "") + "{locale_main_collectionTip}" + (search ? `\n{emoji_glass} ${search}` : ``) }  },
                    { type: "Separator" },
                    { type: "ActionRow", components: [...sortButtons, 
                        { type: "Button", button_data: { label: "{locale_main_search}", emoji: "glass", id: "26", args: defaults.args } }
                    ] },
                    { type: "Separator", separator_data: { spacing: 2 } },
                    ...sections,
                    { type: "Separator", separator_data: { spacing: 2 } },
                    { type: "ActionRow", components: [
                        { type: "Button", button_data: { emoji: "chevron_double_left", ...defaults, args: { ...defaults.args, page: pageCount+5 } } },
                        { type: "Button", button_data: { emoji: "chevron_single_left", ...defaults, args: { ...defaults.args, page: page-1 } } },
                        { type: "Button", button_data: { label: player.config.isMobile ? `${page}/${pageCount}` : `\u2800 {locale_main_page}\u2800${page} / ${pageCount} \u2800`, ...defaults, id: "5", args: { min: 1, max: pageCount, index: 1, customId: Object.values(defaults.args).join(':') } } },
                        { type: "Button", button_data: { emoji: "chevron_single_right", ...defaults, args: { ...defaults.args, page: page+1 } } },
                        { type: "Button", button_data: { emoji: "chevron_double_right", ...defaults, args: { ...defaults.args, page: -5 } } },
                    ] },
                ]
            }], {
                owner: [`${owner.displayName}`]
            })
        }

    }
});