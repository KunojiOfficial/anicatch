import { ButtonStyle, InteractionReplyOptions, UnfurledMediaItem } from "discord.js";
import Interactable from "../../classes/Interactable.ts";
import _catch from "../../mechanics/catch.ts";

import Rarity from "../../classes/Rarity.ts";

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

        const captureData = await _catch(interaction, card, ball);
        const captured = captureData.caught;

        const message = interaction.message;
        if (!message) return;
        if (!message.flags || !message.flags.has("IsComponentsV2"))  return;
        if (!message.components) return;

        const editable = message.components.findIndex(c => c.id === 500);
        if (editable === -1) return;

        //new buttons
        const rarity = new Rarity(card.rarity).data;
        message.components[message.components.length-1] = !captured ? interaction.componentsV2.construct([{
            type: "ActionRow", components: [
                { type: "Button", button_data: { id: "8", label: "{locale_main_anotherChance} (-20)", emoji: "smallGem", cooldown: { id: "chance", time: 5 }, args: { cardId: card.id } } },
                { type: "Button", button_data: { id: "2", label: `{locale_main_next} (${player.data.encounters})`, emoji: "next", style: "Success", args: { id: Number(embedTimeoutId) }, cooldown: { id: "next", time: 2 } } },
            ]
        }])[0] : interaction.componentsV2.construct([{
            type: "ActionRow", components: [
                { type: "Button", button_data: { id: "7", label: `{locale_main_sell} (+${rarity.sellPrice})`, emoji: "whsmallCoin", cooldown: { id: "sell", time: 5 }, args: { cardId: card.id }, style: "Danger" } },
                { type: "Button", component_id: 101, button_data: { id: "2", label: `{locale_main_next} (${player.data.encounters})`, emoji: "next", style: "Success", args: { id: Number(embedTimeoutId) }, cooldown: { id: "next", time: 2 } } },
                { type: "Button", button_data: { id: "0F", label: "{locale_main_viewDetails}", emoji: "glass", args: { path: "animon", cardId: card.id } } },
            ]
        }])[0];

        message.components[editable] = interaction.componentsV2.construct([{
            type: "Container", component_id: captured ? 501 : 502, container_data: { color: captured ? "#00ff00" : "#ff0000" },  components: [
                { type: "TextDisplay", text_display_data: { content: captured ? `{emoji_yes}\u2800{locale_main_catchSuccess}\n-# \u2800\u2800\u2800 {locale_main_catchSuccess2}` : `{emoji_no}\u2800{locale_main_catchFailure}\n-# \u2800\u2800\u2800 {locale_main_catchFailure3}\n-# \u2800\u2800\u2800 {locale_main_catchFailure2}` } },
            ]
        }], {
            name: [`**${card.card.character.name}**`],
            ball: [`**${ball.item.emoji} ${client.formatText(`{locale_items_${ball.item.name}_name}`, interaction.locale)}**`],
            roll: [`**${Math.floor(captureData.roll*100)}**`],
            chance: [`**${Math.floor(captureData.chance*100)}**`]
        })[0];

        //iterate throught the ball buttons
        for (let actionRow of (message as any).components[0].components) {
            if (actionRow.id < 400) continue;

            for (let button of actionRow.components) {
                if (button.id-3000 === ball.itemId) {
                    button.data.style = captured ? ButtonStyle.Success : ButtonStyle.Danger;
                    button.data.label = (parseInt(button.data.label)-1).toString();
                }

                button.data.disabled = true;
            }
        }

        //for some reason, the media gallery needs to be converted to JSON and back to work properly
        (message as any).components[0].components.splice(4, 1);
        const component: any = message.components[0].toJSON();
        component.components.splice(4, 0, { type: 12, items: [ { media: { url: "attachment://card.jpg" } } ] });
        message.components[0] = component;

        return {
            components: message.components
        }
    }
})