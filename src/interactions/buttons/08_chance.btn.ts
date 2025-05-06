import { InteractionReplyOptions } from "discord.js";
import Interactable from "../../classes/Interactable.ts";
import Rarity from "../../classes/Rarity.ts";

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
                flags: [ "IsComponentsV2" ],
                components: interaction.componentsV2.construct([{
                    type: "Container", container_data: { color: "#a04bd3" }, components: [
                        { type: "TextDisplay", text_display_data: { content: `${player.user}` } },
                        { type: "Separator" },
                        { type: "TextDisplay", text_display_data: { content: `{locale_main_notEnoughGems}` } },
                        { type: "Separator", separator_data: { spacing: 2 } },
                        { type: "ActionRow", components: [
                            { type: "Button", button_data: { id: "0", label: "\u2800{locale_main_getMoreGems}", emoji: "gem", args: { path: "gems" } } }
                        ] }
                    ]
                }])
            });
            return {};
        }

        const balls = await client.db.inventory.findMany({ where: { userId: player.data.id, item: { type: "BALL" } }, include: { item: true } });
        if (!balls.length) throw 12;
        
        balls.sort((a,b) => a.itemId-b.itemId);

        await client.db.$transaction(async tx => {
            await tx.user.updateMany({ where: { id: player.data.id }, data: { gems: { decrement: COST } }});
            await tx.cardInstance.updateMany({ where: { id: animon.id }, data: { status: "WILD" } });
        });

        //make ball buttons
        const ballButtons = balls.map( b => ({
            component_id: 3000+b.itemId,
            type: "Button",
            button_data: {
                id: 1,
                label: b.count.toString(),
                hardEmoji: b.item.emoji,
                args: { cardId: animon.id, ballId: b.itemId }
            }
        }));

        let j = -1;
        const actionRows = [];
        for (const [index, button] of ballButtons.entries()) {
            if (index % 3 === 0) {
                actionRows.push({ type: "ActionRow", component_id: 400+index, components: [] });
                j++;
            }

            actionRows[j].components.push(button);
        }

        const message = interaction.message;
        if (!message) return {};
        if (!message.flags || !message.flags.has("IsComponentsV2")) {
            await interaction.followUp({
                flags: ["IsComponentsV2"],
                components: interaction.componentsV2.construct(actionRows)
            });

            return {};
        }

        if (!message.components) return {};

        const editable = message.components.findIndex(c => c.id === 502);
        if (editable == -1) return {};

        //iterate throught the ball buttons
        for (let actionRow of (message as any).components[0].components) {
            if (actionRow.id < 400) continue;

            //remove action rows
            (message as any).components[0].components.splice((message as any).components[0].components.indexOf(actionRow), 1);
        }

        message.components[editable] = interaction.componentsV2.construct([{
            type: "Container", component_id: 500, container_data: { color: new Rarity(animon.rarity).color }, components: [
                { type: "TextDisplay", text_display_data: { content: `{emoji_aniball}\u2800{locale_main_useItemsAbove}` } },
            ]
        }])[0];


        //for some reason, the media gallery needs to be converted to JSON and back to work properly
        (message as any).components[0].components.splice(4, 1);
        const component: any = message.components[0].toJSON();
        component.components.splice(4, 0, { type: 12, items: [ { media: { url: "attachment://card.jpg" } } ] });
        message.components[0] = component;

        //add ball buttons
        (message as any).components[0].components = [...(message as any).components[0].components, ...interaction.componentsV2.construct(actionRows)]; 
        
        //action buttons
        for (let button of (message as any).components[message.components.length-1].components) {
            button.data.disabled = true;
        }

        return {
            components: message.components
        }
    }
})