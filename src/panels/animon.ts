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
    else return undefined;
}

async function main(interaction: DiscordInteraction, where: any) {
    const { client } = interaction;

    const animon = await client.db.cardInstance.findFirst({ where: where, include: { card: { include: { character: true } }, ball: true, user: true } });
    if (!animon) throw 5;

    const card = new Card({card: animon, parent: animon.card, client: client});
    const attachment = await card.generateImage()!;
    const rarity = card.getRarity()!;
    const type = card.getType()!;

    return [{ 
        embeds: [ interaction.components.embed({
            description: getDesc(animon, interaction.player),
            fields: [
                { name: "\u2800", value: `-# Name\n${animon.card.character.name}\u2800\u2800\n-# Type\n${type.name} ${type.emoji}\n-# Caught\n${client.unixDate(animon.createdAt)}\n\u2800`, inline: true },
                { name: "\u2800", value: `-# ID\n\`${client.getId(animon.cardId, animon.print).padEnd(7, " ")}\`\n-# Ball\n{locale_items_${animon.ball?.name}_name} ${animon.ball?.emoji}`, inline: true },
                // { name: "\u2800", value: `-# Rarity\n**${rarity.name}** (${rarity.chance}%)\n${rarity.emoji.full}` },
            ],
            color: rarity.color,
            image: "attachment://card.jpg"
        }) ],
        files: [attachment]
    }, animon];
}

async function stats(interaction: DiscordInteraction, where: any) {
    const { client, player } = interaction;

    const animon = await client.db.cardInstance.findFirst({ where: where, include: { card: { include: { character: true } }, stat: true, user: true } });
    if (!animon || !animon.stat) throw 5;

    const card = new Card({card: animon, parent: animon.card, stats: animon.stat, client: client});
    const stats = card.getStats();
    const rarity = card.getRarity()!;
    const attachment = await card.generateImage()!;

    const fields = [{
        name: "\u2800",
        value: `**Level ${card.getLevel()}** (${card.getPercentage()}%)\n${card.getExpBar()}\n-# The maximum level for this rarity is **${card.getRarity()?.maxLevel||0}**.`,
        inline: false
    }, {
        name: "Current Health",
        value: `${card.getHealthBar()}\n-# {number_${card.getCurrentHealth()}}/{number_${card.getMaxHealth()}} (${Math.floor(card.getCurrentHealth()!/card.getMaxHealth()*100)}%)\n\u2800`
    }];

    for (const key of Object.keys(stats)) {
        fields.push({ 
            name: `{locale_main_stats_${key}}`,
            value: `${stats[key as keyof typeof stats]}\n-# ${animon.stat[key as keyof typeof animon.stat]}/20`,
            inline: true
        });
    }

    return [{
        embeds: [ interaction.components.embed({
            description: getDesc(animon, interaction.player),
            fields: fields,
            image: `attachment://${attachment?.name}`,
            color: rarity.color
        }) ],
        files: [attachment]
    }, animon];
}

export default new Panel({
    name: "animon",
    async execute(interaction: DiscordInteraction, id: string | number, userAccess: boolean = false, page: string = "main"): Promise<InteractionReplyOptions> {
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
        if (page === "main") [data, animon] = await main(interaction, where);
        else if (page === "stats") [data, animon] = await stats(interaction, where);
        
        const isOwner = animon.userId === player.data.id;

        const card = new Card({card: animon, client: client});
        const rarity = card.getRarity()!;

        let isTeam = card.card.team>0;

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
            label: "Evolve",
            emoji: "evolve",
            disabled: true
        }])]

        if (isOwner && animon.status !== "TRADE") components = [...components, interaction.components.buttons([{
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

        return {
            ...data,
            components: components
        }
    }
});