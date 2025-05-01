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
        if (animon.status !== "IDLE" && animon.status !== "DEAD") throw 18;
        if (animon.favorite) throw 19;

        const rarity = rarities[animon.rarity.toString() as keyof typeof rarities];

        await client.db.$transaction(async tx => {
            await tx.cardInstance.delete({where: { id: animon.id } });
            await tx.user.updateMany({ where: { id: player.data.id }, data: { coins: { increment: rarity.sellPrice } }});
        });

        const message = interaction.message;
        if (!message) return {};
        if (!message.flags || !message.flags.has("IsComponentsV2"))  return {};
        if (!message.components) return {};

        const editable = message.components.findIndex(c => c.id === 501 || c.id === 690);
        if (editable == -1) return {};

        if (message.components[editable].id === 501) {
            message.components[editable] = interaction.componentsV2.construct([{
                type: "Container", component_id: 503, container_data: { color: "#00ff00" }, components: [
                    { type: "TextDisplay", text_display_data: { content:  `{emoji_yes}\u2800{locale_main_sellSuccess}\n-# \u2800\u2800\u2800 {emoji_smallCoin} {number_${player.data.coins}} ➔ {emoji_smallCoin} {number_${player.data.coins+rarity.sellPrice}}` } },
                ]
            }], {
                name: [`**${animon.card.character.name}**`],
                price: [`{emoji_smallCoin} **${rarity.sellPrice}**`]
            })[0];
            
            //for some reason, the media gallery needs to be converted to JSON and back to work properly
            (message as any).components[0].components.splice(4, 1);
            const component: any = message.components[0].toJSON();
            component.components.splice(4, 0, { type: 12, items: [ { media: { url: "attachment://card.jpg" } } ] });
            message.components[0] = component;
    
            //action buttons
            for (let button of (message as any).components[message.components.length-1].components) {
                if (button.id === 101) continue;
                button.data.disabled = true;
            }
        } else {
            //for some reason, the media gallery needs to be converted to JSON and back to work properly
            (message as any).components[0].components.splice(5, 1);
            const component: any = message.components[0].toJSON();
            component.components.splice(5, 0, { type: 12, items: [ { media: { url: "attachment://card.jpg" } } ] });
            message.components[0] = component;

            message.components.splice(message.components.length-2, 2, interaction.componentsV2.construct([{
                type: "Container", component_id: 503, container_data: { color: "#00ff00" }, components: [
                    { type: "TextDisplay", text_display_data: { content:  `{emoji_yes}\u2800{locale_main_sellSuccess}\n-# \u2800\u2800\u2800 {emoji_smallCoin} {number_${player.data.coins}} ➔ {emoji_smallCoin} {number_${player.data.coins+rarity.sellPrice}}` } },
                ]
            }], {
                name: [`**${animon.card.character.name}**`],
                price: [`{emoji_smallCoin} **${rarity.sellPrice}**`]
            })[0])
        }

        return {
            components: message.components
        }
    }
})