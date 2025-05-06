import { InteractionReplyOptions } from "discord.js";
import { CardInstance } from "@prisma/client";
import { Button, DiscordInteraction } from "../types.ts";

import Panel from "../classes/Panel.ts";
import Card from "../classes/Card.ts";

import _rarities from "../data/rarities.json";
import types from "../data/types.json";
import Rarity from "../classes/Rarity.ts";

export default new Panel({
    name: "anidex",
    async execute(interaction: DiscordInteraction, page: number | string = 1, rarity = 1): Promise<InteractionReplyOptions> {
        const { client } = interaction;        
        let mode = "page";
        if (typeof page === "string" && isNaN(parseInt(page))) mode = "specific";
        else if (typeof page === "string") page = parseInt(page);
        
        let count = await client.db.cardCatalog.count({ where: { id: {gt:0} } }), card, index = 0;
        if (mode === "page" && typeof page === 'number') {
            if (page < 1) page = count;
            else if (page > count) page = 1;
            card = await client.db.cardCatalog.findFirst({ skip: page-1, include: { character: { include: { series: true } }, instances: { where: { status: { in: ["IDLE", "FIGHT"] } } } } });
            index = page;
        } else if (typeof page === 'string') {
            card = await client.db.cardCatalog.findFirst({ where: { id: client.getIdReverse(page) }, include: { character: { include: { series: true } }, instances: { where: { status: { in: ["IDLE", "FIGHT"] } } } } });
            index = await client.db.cardCatalog.count({ where: { id: { lt: card.id } }})+1;
        }

        if (!card) return await client.panels.get("anidex")!.execute!(interaction);
        if (typeof page === 'string') page = card.id as number;

        const type = types[card.type.toString() as keyof typeof types];

        const cardC = new Card({ card: { rarity: rarity } as CardInstance, parent: card });
        const attachment = await cardC.generateImage();

        const defaults = { id: '0', args: { path: "anidex", page: page, rarity: rarity } };

        const rarities: Button[] = [];
        for (const key of Object.keys(_rarities)) {
            const instance = new Rarity(key as any);
            rarities.push({
                id: "0",
                hardEmoji: client.formatText(instance.getShortEmoji(),interaction.locale),
                style: rarity == key ? "blurple" : "gray",
                disabled: rarity == key,
                args: { path: "anidex", page: index, rarity: key }
            });
        }

        const rarityGroups = [];
        for (let i = 0; i < rarities.length; i += 4) {
            rarityGroups.push(interaction.components.buttons(rarities.slice(i, i + 4)));
        }

        return {
            embeds: [ interaction.components.embed({
                fields: [
                    { name: "\u2800", value: `-# {locale_main_nameCard}\n${card.character.name}\n${card.character.series ? `-# {locale_main_series}\n${card.character.series.english_title}\n` : ""}-# {locale_main_type}\n${type.name} {emoji_${type.name.toLowerCase()}}`, inline: true },
                    { name: "\u2800", value: `-# {locale_main_id}\n\`${client.getId(card.id).padEnd(3, " ")}\``, inline: true },
                    { name: "\u2800", value: `-# {locale_main_totalCaught}: **${card.instances.length}**\n-# ` + [...new Set(card.instances.map(c => c.rarity))].map(r => `${(new Rarity(r as any)).getShortEmoji()} **${card.instances.filter((c:any) => c.rarity === r).length}**`).join(" ") + "\u2800" }
                ],
                image: "attachment://card.jpg",
                color: cardC.rarity.color
            }) ],
            files: [attachment!],
            components: [ interaction.components.buttons([{
                ...defaults,
                emoji: "chevron.single.left",
                args: { ...defaults.args, page: index-1 }
            }, {
                id: '5',
                label: `{number_${index}} / {number_${count}}`,
                args: { min: 1, max: count, index: 1, customId: Object.values(defaults.args).join(':') }
            }, {
                ...defaults,
                emoji: "chevron.single.right",
                args: { ...defaults.args, page: index+1 }
            }, {
                id: "24",
                emoji: "glass"
            }]), ...rarityGroups ]
        }
    }
});