import { InteractionReplyOptions } from "discord.js";
import Interactable from "../../classes/Interactable.ts";
import _catch from "../../mechanics/catch.ts";

import rarities from "../../data/rarities.json";

export default new Interactable({
    id: 1,
    async execute(interaction): Promise<InteractionReplyOptions> {
        const { args, client, player } = interaction;
        const [ cardId, ballId, timeoutId, embedTimeoutId ] = args;

        const [ ball, card ] = await Promise.all([
            client.db.inventory.findUnique({ where: { itemId_userId: { itemId: parseInt(ballId), userId: player.data.id }, count: { gte: 1 } }, include: { item: true } }),
            client.db.cardInstance.findFirst({ where: { userId: player.data.id, id: parseInt(cardId), status: "WILD" }, include: { card: { include: { character: true } } } })
        ])

        if (!ball) throw 4;
        if (!card) throw 5;
        
        clearTimeout(parseInt(embedTimeoutId));
        clearTimeout(parseInt(timeoutId));

        const captured = await _catch(interaction, card, ball);

        const components = interaction.message?.components;
        const newComponents = [];
        const rarity = rarities[card.rarity.toString() as keyof typeof rarities];
        
        if (components.length) {
            for (const [index, component] of components.entries()) {
                const buttons = [];  
                
                for (const button of component.components) {
                    let data = { ...button.data, disabled: true, style: 2 } as any;
                    if (button.customId === interaction.customId) {
                        data.style = captured.caught ? 3 : 4;
                        data.label = parseInt(data.label)-1;
                    }

                    else if (button.customId?.includes("next")) data = button.data;

                    buttons.push(data);
                }

                newComponents.push({
                    ...component.data,
                    components: buttons
                });
            }
        }

        if (captured.caught) {
            newComponents.push(interaction.components.buttons([{
                id: "7",
                label: `{locale_main_sell} (+${rarity.sellPrice})`,
                emoji: "whsmallCoin",
                cooldown: { id: "sell", time: 5 },
                args: { cardId: card.id },
                style: "red"
            }, {
                id: "0F",
                label: "{locale_main_viewDetails}",
                emoji: "glass",
                args: { path: "animon", cardId: card.id },
            }]))
        } else {
            newComponents.push(interaction.components.buttons([{
                id: "8",
                label: "{locale_main_anotherChance} (-20)",
                emoji: "smallGem",
                cooldown: { id: "chance", time: 5 },
                args: { cardId: card.id }
            }]))
        }

        return {
            embeds: [ 
                {
                    ...interaction.message.embeds[0].data,
                    description: interaction.message.embeds[0].data.footer?.text ? interaction.message.embeds[0].data.description : interaction.message.embeds[0].data.description?.substring(0, interaction.message.embeds[0].description?.indexOf("-#", 3)), 
                    image: { url: "attachment://card.jpg" }
                }, 
                interaction.components.embed({
                    description: captured.caught ? `{emoji_yes}\u2800{locale_main_catchSuccess}\n-# \u2800\u2800\u2800{locale_main_catchSuccess2}` : `{emoji_no}\u2800{locale_main_catchFailure}\n-# \u2800\u2800\u2800{locale_main_catchFailure3}\n-# \u2800\u2800\u2800**{locale_main_catchFailure2}**`,
                    color: captured.caught ? "#00ff00" : "#ff0000"
                }, {
                    name: [`**${card.card.character.name}**`],
                    ball: [`**${ball.item.emoji} ${client.formatText(`{locale_items_${ball.item.name}_name}`, interaction.locale)}**`],
                    roll: [`${captured.roll.toFixed(3)}`],
                    chance: [`${captured.chance.toFixed(3)}`],
                })
            ],
            components: newComponents,
        };
    }
})