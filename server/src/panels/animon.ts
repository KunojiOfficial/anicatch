import { AttachmentBuilder, InteractionReplyOptions } from "discord.js";
import { DiscordInteraction } from "../types";
import Panel from "../classes/Panel";
import Card from "../classes/Card";
import { CardInstance, CardStatus } from "@prisma/client";
import Player from "../classes/Player";

function getDesc(card: CardInstance, player: Player) {
    if (card.userId !== player.data.id) return undefined;

    if (card.status === "DEAD") return `-# This Animon is unconscious.\n-# Revive it using items from {command_store}.`;
    else if (card.status === "TRADE") return `-# This Animon is present in active trade offer.\n-# To manage it, first reject the offer with {command_trade list}.`;
    else if (card.status === "FIGHT") return `-# This Animon is currently in a fight.\n-# You can't manage it until the fight is over.`;
    else return undefined;
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
        label: animon.favorite ? "\u2800Un-Favorite" : "\u2800Favorite",
        emoji: animon.favorite ? "favorite2" : "unfavorite",
        args: { cardId: animon.id },
        cooldown: { id: "fav", time: 2 }
    }, {
        id: "12",
        label: isTeam ? "\u2800Un-Team" : "\u2800Team",
        emoji: isTeam ? "team" : "unteam",
        args: isTeam ? { action: "clear", slot: card.card.team, where: "card", data: `${card.card.id}:${userAccess}:${page}` } : { action: "add", slot: card.card.id,  where: "card", data: `${card.card.id}:${userAccess}:${page}` }
    }]), interaction.components.buttons([{
        id: "0",
        label: "\u2800Use Items",
        emoji: "donut",
        args: { path: "fastUse", cardId: card.card.id }
    },  {
        id: '7',
        label: `\u2800Sell (+${rarity.sellPrice})`,
        emoji: "smallCoin",
        disabled: animon.favorite,
        args: { cardId: animon.id },
        cooldown: { id: "sell", time: 5 }
    }]) ];

    return [{
        embeds: [ interaction.components.embed({
            description: getDesc(animon, interaction.player),
            fields: [
                { name: "\u2800", value: `-# Name\n${animon.card.character.name}\u2800\u2800\n-# Type\n${type.name} ${type.emoji}\n-# Caught\n${client.unixDate(animon.createdAt)}` + (!player.config.isMobile ? "\n\u2800" : ""), inline: true },
                { name: "\u2800", value: `-# ID\n\`${client.getId(animon.cardId, animon.print).padEnd(7, " ")}\`\n-# Ball\n{locale_items_${animon.ball?.name}_name} ${animon.ball?.emoji}`, inline: true },
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
        value: `You have **${card.getStatPoints()} Attribute Points** to allocate.\n-# You gain **${keys.length} points** each time your Animon levels up.\n-# Attributes enhance the effectiveness of specific moves during battle.\n\u2800`,
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
        label: "Allocate Points",
        emoji: "plus",
        style: "green",
        args: { path: "allocate", cardId: animon.id },
        disabled: card.getStatPoints() < 1 || animon.status !== "IDLE"
    }]) ];

    let desc = getDesc(animon, interaction.player) || "";
    desc += desc ? "\n\n" : "";

    let hpPercentage = Math.floor(card.getCurrentHealth()!/card.getMaxHealth()*100);
    desc += `**Level ${card.getLevel()}** (${card.getPercentage()}%)\n${card.getExpBar(player.config.isMobile ? 8 : 15)}\n-# The maximum level for this rarity is **${card.getRarity()?.maxLevel||0}**.\n-# Evolve your Animon to increase its level cap.`;
    desc += `\n\n**Health** (${hpPercentage}%) \n${card.getHealthBar(player.config.isMobile ? 8 : 15)}\n-# {number_${card.getCurrentHealth()}}/{number_${card.getMaxHealth()}}`;

    return [{
        embeds: [ interaction.components.embed({
            description: desc,
            fields: fields,
            thumbnail: `attachment://${attachment?.name}`,
            color: rarity.color
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

        let components = [interaction.components.buttons([{
            id: "0",
            label: "Info",
            emoji: "info",
            style: page === "main" ? "blurple" : "gray",
            disabled: page === "main",
            args: { path: "animon", id: animon.id, userAccess: false, page: "main" }
        }, {
            id: "0",
            label: "Stats",
            style: page === "stats" ? "blurple" : "gray",
            emoji: "stats",
            disabled: page === "stats",
            args: { path: "animon", id: animon.id, userAccess: false, page: "stats" }
        }, {
            label: "Moves",
            emoji: "evolve",
        }])]

        return {
            content: `-# #${animon.id}`,
            ...data,
            components: [...components, ...data.components]
        }
    }
});