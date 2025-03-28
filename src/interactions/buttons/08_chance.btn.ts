import { InteractionReplyOptions } from "discord.js";
import Interactable from "../../classes/Interactable.ts";

const COST = 20;

export default new Interactable({
    id: 8,
    async execute(interaction): Promise<InteractionReplyOptions> {
        const { args, client, player } = interaction;
        let [ cardId ] = args;
        cardId = parseInt(cardId);

        const animon = await client.db.cardInstance.findFirst({ where: { id: cardId }, include: { card: { include: { character: true } } } });
        if (!animon) throw 5;
        if (animon.userId !== player.data.id) throw 17;
        if (animon.status !== "FLED") throw 21;
        if (player.data.gems < COST) { // not enough gems
            await interaction.followUp({
                embeds: [ interaction.components.embed({
                    description: `{locale_errors_22}`,
                    color: "#ff0000"
                }) ],
                components: [ interaction.components.buttons([{
                    id: "0F",
                    label: "{locale_main_getMoreGems}",
                    emoji: "getGems",
                    args: { path: "gems" }
                }]) ]
            });
            return {};
        }

        await client.db.$transaction(async tx => {
            await tx.user.updateMany({ where: { id: player.data.id }, data: { gems: { decrement: COST } }});
            await tx.cardInstance.updateMany({ where: { id: animon.id }, data: { status: "WILD" } });
        });

        //get user balls :)
        const balls = await client.db.inventory.findMany({ where: { userId: player.data.id, item: { type: "BALL" } }, include: { item: true } });
        balls.sort((a,b) => a.itemId-b.itemId);
        const buttons = balls.map(b => ({ emoji: b.item.emoji, label: b.count.toString(), id: 1, args: { cardId: animon.id, ballId: b.itemId, timeoutId: -1, embedTimeout: -1 } }));

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
            label: `{locale_main_next} (${player.data.encounters-1})`,
            emoji: "next",
            cooldown: { id: "next", time: 2 },
            args: { id: -1 },
            disabled: true
        }]))
        
        return {
            embeds: [ 
                { 
                    ...interaction?.message?.embeds[0].data,
                    image: { url: "attachment://card.jpg" },
                    footer: { icon_url: client.getEmojiUrl("gem"), text: client.formatText("{locale_main_secondChance}", interaction.locale) }
                }
            ],
            components: components
        }
    }
})