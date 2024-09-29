import { InteractionReplyOptions, AttachmentBuilder } from "discord.js";
import { DiscordInteraction } from "../types";
import Panel from "../classes/Panel";

import encounter from '../mechanics/encounter';

export default new Panel({
    name: "encountering",
    async execute(interaction: DiscordInteraction): Promise<InteractionReplyOptions> {
        const { user, player, client } = interaction;

        const data = await encounter(interaction);

        //get image
        const filePath = `./src/assets/cards/${data.result.id-1}.jpg`;
        const attachment = new AttachmentBuilder(filePath, { name: "card.jpg" });

        const type = client.data.types[data.result.type.toString() as keyof typeof client.data.types];
        const escapeTime = new Date();
        escapeTime.setSeconds(escapeTime.getSeconds() + 10);

        const embed = {
            description: `🍃 A wild **${data.result.character.name}** has appeared!\nIt's a **${type.emoji} ${type.name}** type!\n\n**${data.rarity.name}** (${data.rarity.chance}%)\n${data.rarity.emoji.full}\n\n-# Escapes ${client.unixDate(escapeTime)}...`,
            image: "attachment://card.jpg",
            color: data.rarity.color
        };

        let followUp:any;
        //edit message after animon escapes
        const timeOutId = setTimeout(async () => {
            await followUp.edit({
                components: [],
                embeds: [ 
                    {
                        ...followUp.embeds[0].data,
                        description: followUp.embeds[0].data.description?.substring(0, followUp.embeds[0].description?.indexOf("-#")), 
                        image: { url: "attachment://card.jpg" },
                    },
                    interaction.components.embed({
                        color: "#ffffff",
                        description: "🏃\u2800{locale_main_catchEscape}"
                    })
                ]
            });
        }, 1000 * 10);

        //get user balls :)
        const balls = await client.db.inventory.findMany({ where: { userId: player.data.id, item: { type: "BALL" } }, include: { item: true } });
        balls.sort((a,b) => a.itemId-b.itemId);
        const buttons = balls.map(b => ({ emoji: b.item.emoji, label: b.count.toString(), id: 1, args: { cardId: data.insert.id, ballId: b.itemId, timeoutId: data.timeout, embedTimeout: timeOutId } }));

        let k = -1, components = [];
        for (const [index, button] of buttons.entries()) {
            if (index % 5 === 0) {
                components.push([]);
                k++;
            }

            components[k].push(button as never);
        }

        if (components.length) components = components.map(c => interaction.components.buttons(c));

        components.push(interaction.components.buttons([{
            id: '2',
            label: "Next",
            emoji: "next",
            cooldown: { id: "next", time: 2 },
            args: { id: timeOutId },
        }]))

        //send message
        followUp = await interaction.followUp({
            content: `${user}`,
            embeds: [interaction.components.embed(embed)],
            files: [attachment],
            components: components.length ? components as any : []
        });

        return {};
    }
});