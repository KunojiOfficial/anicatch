import { InteractionReplyOptions } from "discord.js";
import Interactable from "../../classes/Interactable.ts";
import itemUse from "../../mechanics/itemUse.ts";

export default new Interactable({
    id: 9,
    dontReply: true,
    async execute(interaction): Promise<InteractionReplyOptions> {
        const { client, args, player } = interaction;
        let [ itemId, count ] = args;
        itemId = parseInt(itemId), count =  parseInt(count);
        
        const items = await client.db.inventory.findFirst({ where: { userId: player.data.id, itemId: itemId }, include: { item: true } });
        if (!items) throw 24;
        if (items.count < count) throw 25;

        if (items.item.type !== "CONSUMABLE") await interaction.deferUpdate();
        
        interaction.player = await itemUse(interaction, items, items.item, count);

        const message = await client.panels.get("inventory")!.execute!(interaction, items.count-count > 0 ? items.item.type : "main", 0, itemId, count);

        if (items.item.type === "CONSUMABLE") return message;

        await interaction.editReply({
            ...message,
            components: [ ...message.components, ...interaction.componentsV2.construct([{
                type: "Container", container_data: { color: "#00ff00" }, components: [
                    { type: "TextDisplay", text_display_data: { content: `{locale_main_useSuccess}` } }
                ]
            }], {
                name: [`${items.item.emoji} **${client.formatText(`{locale_items_${items.item.name}_name}`, interaction.locale)}**`],
                count: [`**${count}**`]
            }) ]
        })
    }
});