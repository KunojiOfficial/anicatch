import { InteractionReplyOptions } from "discord.js";
import Interactable from "../classes/Interactable";
import _catch from "../mechanics/catch";

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
        
        if (components.length) {
            for (const [index, component] of components.entries()) {
                const buttons = [];  
                
                for (const button of component.components) {
                    let data = { ...button.data, disabled: true, style: 2 } as any;
                    if (button.customId === interaction.customId) {
                        data.style = captured ? 3 : 4;
                        data.label = parseInt(data.label)-1;
                    }

                    if (index === components.length-1) data = button.data;

                    buttons.push(data);
                }

                if (index === components.length-1) {
                    if (captured) buttons.push({ type: 2, label: "View Details", emoji: client.formatText("{emoji_glass}"), style: 2, customId: "xD" })
                    if (!captured) buttons.push({ type: 2, label: "Another Chance", emoji: client.formatText("{emoji_star}"), style: 2, customId: "xD" })
                }

                newComponents.push({
                    ...component.data,
                    components: buttons
                });
            }
        }

        return {
            embeds: [ 
                {
                    ...interaction.message.embeds[0].data,
                    description: interaction.message.embeds[0].data.description?.substring(0, interaction.message.embeds[0].description?.indexOf("-#")), 
                    image: { url: "attachment://card.jpg" }
                }, 
                interaction.components.embed({
                    description: captured ? `{emoji_yes}\u2800{locale_main_catchSuccess}\n-# \u2800\u2800\u2800{locale_main_catchSuccess2}` : `{emoji_no}\u2800{locale_main_catchFailure}\n-# \u2800\u2800\u2800{locale_main_catchFailure2}`,
                    color: captured ? "#00ff00" : "#ff0000"
                }, {
                    name: [`**${card.card.character.name}**`],
                    ball: [`**${ball.item.name}**`]
                })
            ],
            components: newComponents,
        };
    }
})