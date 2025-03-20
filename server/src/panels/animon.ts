import { InteractionReplyOptions } from "discord.js";
import { CardInstance } from "@prisma/client";

import { DiscordInteraction } from "../types.ts";

import Player from "../classes/Player.ts";
import Panel from "../classes/Panel.ts";
import Card from "../classes/Card.ts";

function getDesc(card: CardInstance, player: Player) {
    if (card.userId !== player.data.id) return undefined;
    if (card.status === "IDLE") return undefined;

    return `{locale_main_statusInfo_${card.status}}`;
}

async function moves(interaction: DiscordInteraction, where: any) {
    const { client, player } = interaction;

    const animon = await client.db.cardInstance.findFirst({ where: where, include: { card: { include: { character: true } }, user: true, moves: true } });
    if (!animon) throw 5;

    const fields = [];
    for (let i = 0; i < 4; i++) {
        const move = animon.moves[i];
        if (!move) fields.push({ name: `{locale_main_emptyMove} ${i+1}`, value: `-# {locale_main_emptyMoveText}` });
        else fields.push({ name: `{emoji_${move.type.toLowerCase()}}\u2800${move.name}`, value: `-# **{locale_main_power}:** ${move.power}\u2800**{locale_main_accuracy}:** ${move.accuracy}%\u2800**{locale_main_limit}:** ${move.pp}\n-# {locale_main_${move.moveType}}` });
    }

    const card = new Card({card: animon, parent: animon.card });

    return [{
        embeds: [ interaction.components.embed({
            description: `${player.getBalance()}\n{locale_main_manageMoves}\n\u2800`,
            fields: fields,
            color: card.getRarity()?.color,
            thumbnail: "attachment://card.jpg"
        }) ],
        components: [interaction.components.buttons([{
            label: "{locale_main_editMoves}",
            emoji: "plus",
            style: "green",
            args: { path: "moves", cardId: animon.id }
        }]) ]
    }, animon]
}

async function main(interaction: DiscordInteraction, where: any, userAccess: boolean = false, page: string = "main") {
    const { client, player } = interaction;

    const animon = await client.db.cardInstance.findFirst({ where: where, include: { card: { include: { character: true } }, ball: true, user: true } });
    if (!animon) throw 5;

    const card = new Card({card: animon, parent: animon.card });
    const attachment = await card.generateImage()!;
    const rarity = card.getRarity()!;
    const type = card.getType()!;

    const isOwner = animon.userId === player.data.id;
    let isTeam = card.card.team>0;

    let components = [];
    if (isOwner && (animon.status === "IDLE" || animon.status === "DEAD")) components = [...components, interaction.components.buttons([{
        id: '6',
        label: animon.favorite ? "\u2800{locale_main_unFav}" : "\u2800{locale_main_fav}",
        emoji: animon.favorite ? "favorite2" : "unfavorite",
        args: { cardId: animon.id },
        cooldown: { id: "fav", time: 2 }
    }, {
        id: "12",
        label: isTeam ? "\u2800{locale_main_unTeam}" : "\u2800{locale_main_team}",
        emoji: isTeam ? "team" : "unteam",
        args: isTeam ? { action: "clear", slot: card.card.team, where: "card", data: `${card.card.id}:${userAccess}:${page}` } : { action: "add", slot: card.card.id,  where: "card", data: `${card.card.id}:${userAccess}:${page}` }
    }]), interaction.components.buttons([{
        id: "0",
        label: "\u2800{locale_main_useItems}",
        emoji: "donut",
        args: { path: "fastUse", cardId: card.card.id }
    },  {
        id: '7',
        label: `\u2800{locale_main_sell} (+${rarity.sellPrice})`,
        emoji: "smallCoin",
        disabled: animon.favorite,
        args: { cardId: animon.id },
        cooldown: { id: "sell", time: 5 }
    }]) ];

    return [{
        embeds: [ interaction.components.embed({
            description: getDesc(animon, interaction.player),
            fields: [
                { name: "\u2800", value: `-# {locale_main_nameCard}\n${animon.card.character.name}\u2800\u2800\n-# {locale_main_type}\n${type.name} ${type.emoji}\n-# {locale_main_caught}\n${client.unixDate(animon.createdAt)}` + (!player.config.isMobile ? "\n\u2800" : ""), inline: true },
                { name: "\u2800", value: `-# {locale_main_id}\n\`${client.getId(animon.cardId, animon.print).padEnd(7, " ")}\`\n-# {locale_main_ball}\n{locale_items_${animon.ball?.name}_name} ${animon.ball?.emoji}`, inline: true },
                // { name: "\u2800", value: `-# Rarity\n**${rarity.name}** (${rarity.chance}%)\n${rarity.emoji.full}` },
            ],
            color: rarity.color,
            image: "attachment://card.jpg"
        }) ],
        files: [attachment],
        components: components
    }, animon];
}

async function stats(interaction: DiscordInteraction, where: any, currentStat?: string) {
    const { client, player } = interaction;

    const animon = await client.db.cardInstance.findFirst({ where: where, include: { card: { include: { character: true } }, user: true } });
    if (!animon) throw 5;

    const card = new Card({card: animon, parent: animon.card });
    const stats = card.getStats();
    const rarity = card.getRarity()!;
    const attachment = await card.generateImage()!;
    const keys = Object.keys(stats).filter(key => key !== "hp");

    let fields = [{
        name: `\u2800`,
        value: `{locale_main_pointsText}\n\u2800`,
        inline: false
    }];

    for (const key of keys) {
        if (key === "hp") continue;
        if (!player.config.isMobile)
            fields = [...fields, 
                { name: `{locale_main_stats_${key}}` + (currentStat === key ? " {emoji_chevron_single_left}" : ""), value: `-# {locale_main_stats_${key}Desc}`, inline: true }, 
                { name: "\u2800", value: `\u2800`, inline: true },
                { name: "\u2800", value: `**\`${stats[key].toString().padStart(5)}\`**`, inline: true }
            ];
        else fields = [...fields, { name: `{locale_main_stats_${key}}`, value: `**\`${stats[key].toString().padStart(5)}\`**`, inline: true }];
    }

    let components = [ interaction.components.buttons([{
        label: "{locale_main_allocatePoints}",
        emoji: "plus",
        style: "green",
        args: { path: "allocate", cardId: animon.id },
        disabled: card.getStatPoints() < 1 || animon.status !== "IDLE"
    }]) ];

    let desc = getDesc(animon, interaction.player) || "";
    desc += desc ? "\n\n" : "";

    let hpPercentage = Math.floor(card.getCurrentHealth()!/card.getMaxHealth()*100);
    desc += `**{locale_main_level} ${card.getLevel()}** (${card.getPercentage()}%)\n${card.getExpBar(player.config.isMobile ? 8 : 15)}\n-# {locale_main_maxLevelTip}\n-# {locale_main_evolveTip}`;
    desc += `\n\n**{locale_main_health}** (${hpPercentage}%) \n${card.getHealthBar(player.config.isMobile ? 8 : 15)}\n-# {number_${card.getCurrentHealth()}}/{number_${card.getMaxHealth()}}`;

    return [{
        embeds: [ interaction.components.embed({
            description: desc,
            fields: fields,
            thumbnail: `attachment://${attachment?.name}`,
            color: rarity.color
        }, {
            points: [`${card.getStatPoints()}`],
            count: [`${keys.length}`],
            maxLevel: [`${card.getRarity()?.maxLevel||0}`] 
        }) ],
        files: [attachment],
        components: components
    }, animon];
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

        let [data, animon]: [any, any] = [{}, {}];
        if (page === "main") [data, animon] = await main(interaction, where, userAccess);
        else if (page === "stats") [data, animon] = await stats(interaction, where, additional);
        else if (page === "moves") [data, animon] = await moves(interaction, where);

        let components = [interaction.components.buttons([{
            id: "0",
            label: "{locale_main_info}",
            emoji: "info",
            style: page === "main" ? "blurple" : "gray",
            disabled: page === "main",
            args: { path: "animon", id: animon.id, userAccess: false, page: "main" }
        }, {
            id: "0",
            label: "{locale_main_statsShort}",
            style: page === "stats" ? "blurple" : "gray",
            emoji: "stats",
            disabled: page === "stats",
            args: { path: "animon", id: animon.id, userAccess: false, page: "stats" }
        }, {
            id: "0",
            label: "{locale_main_moves}",
            style: page === "moves" ? "blurple" : "gray",
            emoji: "evolve",
            disabled: page === "moves",
            args: { path: "animon", id: animon.id, userAccess: false, page: "moves" }
        }])]

        return {
            ...data,
            components: [...components, ...data.components]
        }
    }
});