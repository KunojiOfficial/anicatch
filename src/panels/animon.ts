import { InteractionReplyOptions } from "discord.js";
import { CardInstance } from "@prisma/client";

import { DiscordInteraction } from "../types.ts";
import { Component, StringSelectOption } from "../types/componentTypes.ts";

import Player from "../classes/Player.ts";
import Panel from "../classes/Panel.ts";
import Card from "../classes/Card.ts";

function getDesc(card: CardInstance, player: Player) {
    if (card.userId !== player.data.id) return undefined;
    if (card.status === "IDLE") return undefined;

    return `{locale_main_statusInfo_${card.status}}`;
}

const emojis = {
    "ATTACK": "⚔️",
    "DEFENSE": "🛡️",
    "SPIRIT_ATTACK": "✨",
    "SPIRIT_DEFENSE": "💨"
}

async function moves(interaction: DiscordInteraction, where: any, type?: string): Promise<[Component[], Card]> {
    const { client, player } = interaction;

    const animon = await client.db.cardInstance.findFirst({ where: where, include: { card: { include: { character: true } }, user: true, moves: true } });
    if (!animon) throw 5;

    const card = new Card({ card: animon, parent: animon.card, moves: animon.moves });
    const isOwner = animon.userId === player.data.id;
    
    const availableMoves = await client.db.moveInventory.findMany({ where: { userId: player.data.id,  OR: [ {move: {type: card.parent!.type}}, {move: {type: "NONE"}} ], move: {requiredLevel: { lte: card.getLevel() }} }, orderBy: [{move: { type: "asc" }}, {move: {power: "asc"}}], include: { move: true } });
    const moveTypes = [... new Set(availableMoves.map(m => m.move.moveType))];

    const moveTypeSelect: Component = { type: "ActionRow", components: [{
        type: "StringSelect", string_select_data: { id: "0", placeholder: "⭐\u2800{locale_main_selectMoveType}", options: moveTypes.map((mType) => ({
            label: `{locale_main_${mType}}`, 
            value: `4:${mType}`, 
            default: mType === type,
            hardEmoji: emojis[mType]
        })), args: { path: "animon", cardId: animon.id, userAccess: false, page: "moves", type: type } }
    }] }

    const isType = type && moveTypes.includes(type as any);

    const filteredMoves: StringSelectOption[] = isType ? availableMoves.filter(m => m.move.moveType === type).map(move => ({
        label: move.move.name,
        emoji: move.move.type.toLowerCase() as any, 
        value: `${move.moveId}`,
        description: `{locale_main_power}: ${move.move.power} | {locale_main_accuracy}: ${move.move.accuracy}% | {locale_main_limit}: ${move.move.pp}`
    })) : [];

    const fields: Component[] = [];
    for (let i = 0; i < 4; i++) {
        const move = animon.moves[i];
        if (!move) {
            if (isType && isOwner) fields.push({
                type: "ActionRow", components: [{
                    type: "StringSelect", string_select_data: { 
                        id: `7`, 
                        placeholder: "⭐\u2800{locale_main_selectMove}", 
                        options: filteredMoves,
                        args: { cardId: animon.id, slot: i+1 } 
                    },
                }]
            }); else fields.push({ type: "TextDisplay", text_display_data: { content: availableMoves.length ? "{locale_main_emptySlot}\n-# {locale_main_selectAMoveType}" : "{locale_main_emptySlot}\n-# {locale_main_youDontHaveMoves}" } })
        } else fields.push({
            type: "Section",
            section_data: { components: [{
                type: "TextDisplay", text_display_data: { content: `{emoji_${move.type.toLowerCase()}}\u2800${move.name}\n-# **{locale_main_power}:** ${move.power}\u2800**{locale_main_accuracy}:** ${move.accuracy}%\u2800**{locale_main_limit}:** ${move.pp}\n-# {locale_main_${move.moveType}}` }
            }], accessory: { type: "Button", button_data: { id: "21", label: "{locale_main_unlearn}", disabled: !isOwner, emoji: "wno", args: { action: "remove", cardId: animon.id, slot: i+1, moveId: animon.moves[i].id } } } }
        });
    }

    const moveEdits: Component[] = [
        { type: "TextDisplay", text_display_data: { content: `{locale_main_filterMoveTypes}` } },
        moveTypeSelect,
        { type: "Separator", separator_data: { spacing: 2 } },
    ]


    return [[{
        type: "Container", component_id: 690, container_data: { color: card.rarity?.color }, components: [
            { type: "Separator", separator_data: { spacing: 2 } },
            { type: "Section", section_data: { components: [
                { type: "TextDisplay", text_display_data: { content: `{locale_main_manageMoves}\n-# {locale_main_howToGetMoves}{emoji_empty}` } },
            ], accessory: { type: "Thumbnail", thumbnail_data: { media: { url: "attachment://card.jpg" } } } } },
            { type: "Separator", separator_data: { spacing: 2 } },
            ...(card.moves.length < 4 && moveTypes.length && isOwner ? moveEdits : [null]),
            ...fields,
        ]
    }], card]
}

async function main(interaction: DiscordInteraction, where: any, userAccess: boolean = false, page: string = "main"): Promise<[Component[], Card]> {
    const { client, player } = interaction;

    const animon = await client.db.cardInstance.findFirst({ where: where, include: { card: { include: { character: true } }, ball: true, user: true } });
    if (!animon) throw 5;

    const card = new Card({card: animon, parent: animon.card, character: animon.card.character });
    const rarity = card.getRarity()!;

    const isOwner = animon.userId === player.data.id;
    let isTeam = card.card.team>0;

    return [[
        { type: "Container", component_id: 690, container_data: { color: rarity.color }, components: [
            { type: "Separator", separator_data: { spacing: 2 } },
            { type: "TextDisplay", text_display_data: { content: `-# {locale_main_id}{emoji_empty}{emoji_empty}{emoji_empty}{emoji_empty} {locale_main_nameCard}\n\`${card.id.padEnd(7, " ")}\`{emoji_empty}\u2800${card.name}` } },
            { type: "TextDisplay", text_display_data: { content: `-# {locale_main_type}\n${card.type.name} {emoji_${card.type.name.toLowerCase()}}`} },
            { type: "Separator", separator_data: { spacing: 2 } },
            { type: "MediaGallery", media_gallery_data: { items: [ { media: { url: `attachment://card.jpg` } } ] } },
            { type: "TextDisplay", text_display_data: { content: `-# ${animon.ball?.emoji}\u2800{locale_main_caught} ${client.unixDate(animon.createdAt)}`} },
        ] }, isOwner && (animon.status !== "IDLE") ? { type: "Container", container_data: { color: "#ffffff" }, components: [
            { type: "TextDisplay", text_display_data: { content: getDesc(animon, player) } }
        ] } : null,
        isOwner && (animon.status === "IDLE" || animon.status === "DEAD") ? { type: "ActionRow", components: [
            { type: "Button", button_data: { id: "6", label: animon.favorite ? "\u2800{locale_main_unFav}" : "\u2800{locale_main_fav}", emoji: animon.favorite ? "favorite2": "unfavorite", args: { cardId: animon.id }, cooldown: { id: "fav", time: 2 } } },
            { type: "Button", button_data: { id: "12", label: isTeam ? "\u2800{locale_main_unTeam}" : "\u2800{locale_main_team}", emoji: isTeam ? "team" : "unteam", args: isTeam ? { action: "clear", slot: card.card.team, where: "card", data: `${card.card.id}:${userAccess}:${page}` } : { action: "add", slot: card.card.id, where: "card", data: `${card.card.id}:${userAccess}:${page}` } } },
        ] } : null,
        isOwner && (animon.status === "IDLE" || animon.status === "DEAD") ? { type: "ActionRow", components: [
            { type: "Button", button_data: { id: "0", label: "\u2800{locale_main_useItems}", emoji: "donut", args: { path: "fastUse", cardId: card.card.id } } },
            { type: "Button", button_data: { id: '7', label: `\u2800{locale_main_sell} (+${rarity.sellPrice})`, emoji: "smallCoin", disabled: animon.favorite, args: { cardId: animon.id }, cooldown: { id: "sell", time: 5 } } }
        ] } : null], card];
}

async function stats(interaction: DiscordInteraction, where: any, points: number | string = 1): Promise<[Component[], Card, object]> {
    const { client, player } = interaction;

    if (typeof points === 'string') points = parseInt(points);
    if (points < 1) points = 1;
    if (points > 50) points = 50;

    const animon = await client.db.cardInstance.findFirst({ where: where, include: { card: { include: { character: true } }, user: true } });
    if (!animon) throw 5;
    
    const isOwner = player.data.id === animon.userId;

    const card = new Card({card: animon, parent: animon.card });
    const stats = card.getStats();
    const rarity = card.getRarity()!;
    const keys = Object.keys(stats).filter(key => key !== "hp");
    const hpPercentage = Math.floor(card.getCurrentHealth()!/card.getMaxHealth()*100);

    const statComponents = keys.map(key => ({
        type: "Section",
        section_data: { components: [{
            type: "TextDisplay",
            text_display_data: { content: !player.config.isMobile ? 
                `**\`${stats[key].toString().padStart(3)}\`**{emoji_empty}**{locale_main_stats_${key}}**` + `\n-# {emoji_empty}{emoji_empty}\u2800 {locale_main_stats_${key}Desc}`
                : `**\`${stats[key].toString().padStart(3)}\`\u2800{locale_main_stats_${key}}**`
            },
        }], accessory: {
            type: "Button",
            button_data: { id: "20", emoji: "plus", disabled: card.getStatPoints() < 1 || !isOwner, args: { cardId: card.numericId, points: points, stat: key } }
        } }
    })) as Component[];

    const canAscend = card.canAscend && isOwner;
    const variables = {
        points: [`${card.getStatPoints()}`],
        count: [`${keys.length}`],
        maxLevel: [`${card.rarity?.maxLevel || 0}`] 
    };

    let ascendData: Component;
    if (canAscend) {
        const crystals = await client.db.inventory.findFirst({ where: { userId: player.data.id, item: { type: "FRAGMENT", properties: { path: ["type"], equals: card.type.name.toUpperCase() } } }, include: { item: true } });
        const count = crystals?.count || 0;

        if (count < card.rarity.ascendCost) { //not enough crystals to ascend
            ascendData = { type: "Section", section_data: {
                components: [
                    { type: "TextDisplay", text_display_data: { content: `**{locale_main_ascension}** [${card.card.ascension+1}/${card.card.rarity}]\n{locale_main_ascensionNeedCrystals}{emoji_empty}` } }
                ], accessory: { type: "Button", button_data: { disabled: true, id: "0", label: "{locale_main_ascend}", emoji: `${card.type.name.toLowerCase().substring(0,3)}_frag` as any } }
            } }

        } else {
            ascendData = { type: "Section", section_data: {
                components: [
                    { type: "TextDisplay", text_display_data: { content: `**{locale_main_ascension}** [${card.card.ascension+1}/${card.card.rarity}]\n{locale_main_ascensionReady}` } }
                ], accessory: { type: "Button", button_data: { id: "0", label: "{locale_main_ascend}", emoji: `${card.type.name.toLowerCase().substring(0,3)}_frag` as any, args: { path: "animon", id: card.numericId, userAccess: false, page: "evolve" } } }
            } }

            variables["ascensionRequired"] = [`**${card.card.rarity}**`];
            variables["increase"] = [`5`];
        }
        
        variables["needed"] = [`{number_${card.rarity?.ascendCost || 0}}`];
        variables["current"] = crystals ? [`{number_${count}}`] : ["0"];
        variables["crystal"] = [`{emoji_${card.type.name.toLowerCase().substring(0,3)}_frag} {locale_items_${card.type.name.toLowerCase()}Fragment_name}`]

    }

    return [[
        { type: "Container", component_id: 690, container_data: { color: rarity.color }, components: [
            { type: "Separator", separator_data: { spacing: 2 } },
            { type: "Section", section_data: { components: [
                { type: "TextDisplay", text_display_data: { content: `**{locale_main_level} ${card.getLevel()}** (${card.getPercentage()}%)\n${card.getExpBar(player.config.isMobile ? 8 : 15)}{emoji_empty}{emoji_empty}\n-# {locale_main_maxLevelTip}\n-# {locale_main_evolveTip}\n\n**{locale_main_health}** (${hpPercentage}%) \n${card.getHealthBar(player.config.isMobile ? 8 : 15)}\n-# {number_${card.getCurrentHealth()}}/{number_${card.getMaxHealth()}}` } },
            ], accessory: { type: "Thumbnail", thumbnail_data: { media: { url: "attachment://card.jpg" } } } } },
            isOwner ? { type: "Separator", separator_data: { spacing: 2 } } : null,
            canAscend ? ascendData : null,
            canAscend ? { type: "Separator", separator_data: { spacing: 2 } } : null,
            isOwner ? { type: "TextDisplay", text_display_data: { content: `{locale_main_pointsText}` } } : null,
            { type: "Separator", separator_data: { spacing: 2 } },
            ...statComponents,
            { type: "Separator", separator_data: { spacing: 2 } },
            card.getStatPoints() > 1 && isOwner ? { type: "Section", section_data: { components: [
                { type: "TextDisplay", text_display_data: { content: `\`   \`{emoji_empty}**{locale_main_pointsToSpend}**\n-# {emoji_empty}{emoji_empty}\u2800 {locale_main_pointsToSpendText}` } }
            ], accessory: { type: "Button", button_data: { id: "5", label: points.toString(), args: { min: 1, max: 50, index: 4, customId: `animon:${animon.id}:false:stats:${points}` } } } } } : null,
        ] },
    ], card, variables];
}

export default new Panel({
    name: "animon",
    async execute(interaction: DiscordInteraction, id: string | number, userAccess: boolean = false, page: string = "main", additional?: string): Promise<InteractionReplyOptions> {
        const { client, player } = interaction;

        if (typeof userAccess !== 'boolean') userAccess = false;
        if (typeof id !== 'number' && !userAccess) id = parseInt(id);
        
        let where = { id: id } as any;
        
        if (userAccess) {
            const [ cardId, print ] = (id as string).split("-"); //for human ID system as ABC-123       

            if (!id || !print) throw 8;
            where = { cardId: client.getIdReverse(cardId), print: parseInt(print) };
        }

        let [components, animon, replace]: [Component[], Card, object] = [[], null, {}];
        if (page === "main") [components, animon] = await main(interaction, where, userAccess);
        else if (page === "stats") [components, animon, replace] = await stats(interaction, where, additional);
        else if (page === "moves") [components, animon] = await moves(interaction, where, additional);

        const navigation: Component = { type: "ActionRow", components: [
            { type: "Button", button_data: { id: "0", label: !player.config.isMobile ? "{locale_main_info}" : undefined, emoji: "info", style: page === "main" ? "Primary" : "Secondary", disabled: page === "main", args: { path: "animon", id: animon.numericId, userAccess: false, page: "main" } } },
            { type: "Button", button_data: { id: "0", label: !player.config.isMobile ? "{locale_main_statsShort}" : undefined, emoji: "stats", style: page === "stats" ? "Primary" : "Secondary", disabled: page === "stats", args: { path: "animon", id: animon.numericId, userAccess: false, page: "stats" } } },
            { type: "Button", button_data: { id: "0", label: !player.config.isMobile ? "{locale_main_moves}" : undefined, emoji: "evolve", style: page === "moves" ? "Primary" : "Secondary", disabled: page === "moves", args: { path: "animon", id: animon.numericId, userAccess: false, page: "moves" } } }
        ] }

        components[0].components = [ navigation, ...components[0].components ];
        const message: any = interaction.message;
        if (message && message.components && message.components[0].id === 690) {
            return {
                flags: ["IsComponentsV2"],
                components: interaction.componentsV2.construct(components, replace)
            }
        }

        return {
            files: [await animon.generateImage(false, 260)],
            flags: ["IsComponentsV2"],
            components: interaction.componentsV2.construct(components, replace)
        }
    }
});