import { AttachmentBuilder, InteractionReplyOptions } from "discord.js";
import { DiscordInteraction } from "../types";
import Panel from "../classes/Panel";

export default new Panel({
    name: "anidex",
    async execute(interaction: DiscordInteraction, page: number | string = 1): Promise<InteractionReplyOptions> {
        const { client } = interaction;        
        
        let mode = "page";
        if (typeof page === "string" && isNaN(parseInt(page))) mode = "specific";
        else if (typeof page === "string") page = parseInt(page);

        let count = await client.db.cardCatalog.count(), card;
        if (mode === "page" && typeof page === 'number') {
            if (page < 1) page = count;
            else if (page > count) page = 1;
            
            card = await client.db.cardCatalog.findFirst({ skip: page-1, include: { character: true, instances: { where: { status: { in: ["IDLE", "FIGHT"] } } } } });
        } else if (typeof page === 'string') {
            card = await client.db.cardCatalog.findFirst({ where: { id: client.getIdReverse(page) }, include: { character: true, instances: { where: { status: { in: ["IDLE", "FIGHT"] } } } } });
        }
        if (!card) return await client.panels.get("anidex")!.execute!(interaction);
        if (typeof page === 'string') page = card.id;

        const type = client.data.types[card.type.toString() as keyof typeof client.data.types];

        const filePath = `./src/assets/cards/${card.id-1}.jpg`;
        const attachment = new AttachmentBuilder(filePath, { name: "card.jpg" });

        const defaults = { id: '0', args: { path: "anidex", page: page } };

        return {
            embeds: [ interaction.components.embed({
                fields: [
                    { name: "\u2800", value: `-# Name\n${card.character.name}\n-# Type\n${type.name} ${type.emoji}`, inline: true },
                    { name: "\u2800", value: `-# ID\n\`${client.getId(card.id).padEnd(3, " ")}\``, inline: true },
                    { name: "\u2800", value: `-# Total Caught: **${card.instances.length}**\n-# ` + [...new Set(card.instances.map(c => c.rarity))].map(r => `${client.data.rarities[r.toString() as keyof typeof client.data.rarities].emoji.short} **${card.instances.filter((c:any) => c.rarity === r).length}**`).join(" ") + "\u2800" }
                ],
                image: "attachment://card.jpg"
            }) ],
            files: [attachment],
            components: [ interaction.components.buttons([{
                ...defaults,
                emoji: "chevron.single.left",
                args: { ...defaults.args, page: page-1 }
            }, {
                label: `${page} / ${count}`
            }, {
                ...defaults,
                emoji: "chevron.single.right",
                args: { ...defaults.args, page: page+1 }
            }]) ]
        }
    }
});