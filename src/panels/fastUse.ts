import { InteractionReplyOptions } from "discord.js";
import { DiscordInteraction } from "../types.ts";
import Panel from "../classes/Panel.ts";
import { ButtonData } from "../types/componentTypes.ts";

export default new Panel({
    name: "fastUse",
    async execute(interaction: DiscordInteraction, cardId: number | string, itemId: number | string, count: number | string): Promise<InteractionReplyOptions> {
        const { client, player } = interaction;

        if (typeof cardId === "string") cardId = parseInt(cardId);
        if (typeof itemId === "string") itemId = parseInt(itemId);
        if (typeof count === "string") count = parseInt(count);
        
        let items = await client.db.inventory.findMany({ where: { userId: player.data.id, item: { type: "CONSUMABLE" } }, include: { item:true }});
        if (!items.length) throw 35;
        if (items.length>25) items = items.slice(0, 24);
        
        let activeItem;
        if (itemId) activeItem = items.find(i => i.itemId == itemId);

        if (count < 1) count = 1;
        else if (itemId && count > (activeItem?.count||0)) count = activeItem?.count||0; 

        const options = []; let buttons: ButtonData[] = [];
        for (const item of items) {
            options.push({
                label: `{locale_items_${item.item.name}_name}`,
                description: `x${item.count}`,
                value: `2:${item.itemId}`,
                hardEmoji: item.item.emoji!,
                default: itemId == item.itemId
            });
        }

        const defaults = {
            id: "0",
            args: { path: "fastUse", cardId: cardId, itemId: itemId, count: count }
        }

        count = count as number;

        buttons = [{
            ...defaults,
            label: "{locale_main_back}",
            emoji: "back",
            args: { path: "animon", cardId: cardId }
        }];

        if (itemId && itemId !== 0) buttons = [...buttons, {
            ...defaults,
            id: '5',
            label: `x${count}`,
            disabled: count <= 1,
            args: { min: 1, max: Math.min(activeItem?.count||0, 50), index: 3, customId: Object.values(defaults.args).join(':') }
        }, {
            id: '13',
            label: "{locale_main_use}",
            emoji: "wyes",
            style: "Success",
            args: { cardId: cardId, itemId: itemId, count: count },
            cooldown: { id: "use", time: 2 }
        }]

        let page = "main";
        
        if (activeItem) {
            let property = activeItem.item.properties as any;
            if (property.effect === "LEVELUP") page = "stats";
            else if (property.effect === "REVIVE") page = "stats";
            else if (property.effect === "HEAL") page = "stats";
        }
        
        const message:any = await client.panels.get("animon")!.execute!(interaction, cardId, false, page);

        if (!message || !message.components) return {};

        if (message.components[message.components.length-2] && message.components[message.components.length-2].type === 1) {
            message.components.pop();
            message.components.pop();
        }

        return {
            ...message,
            components: [ ...message.components, ...interaction.componentsV2.construct([
                { type: "ActionRow", components: [
                    { type: "StringSelect", string_select_data: {
                        id: "0",
                        options: options,
                        placeholder: "🧸\u2800{locale_main_selectAnItem}",
                        args: { path: "fastUse", cardId: cardId, itemId: 0, count: 1 }
                    } }
                ] },
                { type: "ActionRow", components: buttons.map(b => ({
                    type: "Button", button_data: b
                })) }
            ]) ]
        };
    }
}); 