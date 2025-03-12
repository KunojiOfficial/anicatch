import { InteractionReplyOptions } from "discord.js";
import { Button, DiscordInteraction } from "../types";
import Panel from "../classes/Panel";
import Card from "../classes/Card";
import { CardInstance } from "@prisma/client";

import _rarities from "../data/rarities.json";
import types from "../data/types.json";

export default new Panel({
    name: "anidex",
    async execute(interaction: DiscordInteraction, page: number | string = 1, rarity = 1): Promise<InteractionReplyOptions> {
        const { client } = interaction;        
        
        let mode = "page";
        if (typeof page === "string" && isNaN(parseInt(page))) mode = "specific";
        else if (typeof page === "string") page = parseInt(page);

        let count = await client.db.cardCatalog.count(), card;
        if (mode === "page" && typeof page === 'number') {
            if (page < 1) page = count;
            else if (page > count) page = 1;
            card = await client.db.cardCatalog.findFirst({ where: { id: page }, include: { character: { include: { series: true } }, instances: { where: { status: { in: ["IDLE", "FIGHT"] } } } } });
        } else if (typeof page === 'string') {
            card = await client.db.cardCatalog.findFirst({ where: { id: client.getIdReverse(page) }, include: { character: { include: { series: true } }, instances: { where: { status: { in: ["IDLE", "FIGHT"] } } } } });
        }

        if (!card) return await client.panels.get("anidex")!.execute!(interaction);
        if (typeof page === 'string') page = card.id as number;

        const type = types[card.type.toString() as keyof typeof types];

        const cardC = new Card({ card: { rarity: rarity } as CardInstance, parent: card });
        const attachment = await cardC.generateImage();

        const defaults = { id: '0', args: { path: "anidex", page: page, rarity: rarity } };

        const rarities: Button[] = [];
        for (const key of Object.keys(_rarities)) {
            let data = _rarities[key as keyof typeof _rarities];
            rarities.push({
                id: "0",
                hardEmoji: data.emoji.short,
                style: rarity == key ? "blurple" : "gray",
                disabled: rarity == key,
                args: { path: "anidex", page: page, rarity: key }
            });
        }

        const rarityGroups = [];
        for (let i = 0; i < rarities.length; i += 4) {
            rarityGroups.push(interaction.components.buttons(rarities.slice(i, i + 4)));
        }

        return {
            embeds: [ interaction.components.embed({
                fields: [
                    { name: "\u2800", value: `-# Name\n${card.character.name}\n${card.character.series ? `-# Series\n${card.character.series.english_title}\n` : ""}-# Type\n${type.name} ${type.emoji}`, inline: true },
                    { name: "\u2800", value: `-# ID\n\`${client.getId(card.id).padEnd(3, " ")}\``, inline: true },
                    { name: "\u2800", value: `-# Total Caught: **${card.instances.length}**\n-# ` + [...new Set(card.instances.map(c => c.rarity))].map(r => `${_rarities[r.toString() as keyof typeof _rarities].emoji.short} **${card.instances.filter((c:any) => c.rarity === r).length}**`).join(" ") + "\u2800" }
                ],
                image: "attachment://card.jpg",
                color: cardC.getRarity()?.color
            }) ],
            files: [attachment!],
            components: [ interaction.components.buttons([{
                ...defaults,
                emoji: "chevron.single.left",
                args: { ...defaults.args, page: page-1 }
            }, {
                id: '5',
                label: `\u2800\u2800\u2800{number_${page}} / {number_${count}}\u2800\u2800\u2800`,
                args: { min: 1, max: count, index: 1, customId: Object.values(defaults.args).join(':') }
            }, {
                ...defaults,
                emoji: "chevron.single.right",
                args: { ...defaults.args, page: page+1 }
            }]), ...rarityGroups ]
        }
    }
});