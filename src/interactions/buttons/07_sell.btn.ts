import { InteractionReplyOptions } from "discord.js";
import Interactable from "../../classes/Interactable.ts";

import rarities from "../../data/rarities.json";

export default new Interactable({
    id: 7,
    async execute(interaction): Promise<InteractionReplyOptions> {
        const { args, client, player } = interaction;
        let [ cardId ] = args;
        cardId = parseInt(cardId);

        const animon = await client.db.cardInstance.findFirst({ where: { id: cardId }, include: { card: { include: { character: true } } } });
        if (!animon) throw 5;
        if (animon.userId !== player.data.id) throw 17;
        if (animon.status !== "IDLE") throw 18;
        if (animon.favorite) throw 19;

        const rarity = rarities[animon.rarity.toString() as keyof typeof rarities];

        await client.db.$transaction(async tx => {
            await tx.cardInstance.delete({where: { id: animon.id } });
            await tx.user.updateMany({ where: { id: player.data.id }, data: { coins: { increment: rarity.sellPrice } }});
        });

        const components = interaction.message?.components;
        const newComponents = [];

        if (components.length) {
            for (const [index, component] of components.entries()) {
                const buttons = [];  
                
                for (const button of component.components) {
                    let data = { ...button.data, disabled: !button.customId?.includes("next"), style: 2 } as any;
                    buttons.push(data);
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
                    ...interaction?.message?.embeds[0].data,
                    image: { url: "attachment://card.jpg" }
                },
                interaction.components.embed({
                    description: `{emoji_yes}\u2800{locale_main_sellSuccess}\n-# \u2800\u2800\u2800{emoji_smallCoin} {number_${player.data.coins}} ➔ {emoji_smallCoin} {number_${player.data.coins+rarity.sellPrice}}`,
                    color: "#00ff00"
                }, {
                    name: [`**${animon.card.character.name}**`],
                    price: [`{emoji_smallCoin} **${rarity.sellPrice}**`]
                })
            ],
            components: newComponents
        }
    }
})