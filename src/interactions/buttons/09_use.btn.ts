import { InteractionReplyOptions } from "discord.js";
import Interactable from "../../classes/Interactable";
import itemUse from "../../mechanics/itemUse";

export default new Interactable({
    id: 9,
    async execute(interaction): Promise<InteractionReplyOptions> {
        const { client, args, player } = interaction;
        let [ itemId, count ] = args;
        itemId = parseInt(itemId), count =  parseInt(count);
        
        const items = await client.db.inventory.findFirst({ where: { userId: player.data.id, itemId: itemId }, include: { item: true } });
        if (!items) throw 24;
        if (items.count < count) throw 25;
        
        interaction.player = await itemUse(interaction, items, items.item, count);
        
        const message = await client.panels.get("inventory")!.execute!(interaction, items.count-count > 0 ? items.item.type : "main", itemId, count);

        return {
            ...message,
            embeds: [ ...message.embeds!, interaction.components.embed({
                description: `{locale_main_useSuccess}`
            }, {
                name: [`${items.item.emoji} **${items.item.name}**`],
                count: [`**${count}**`]
            }) ]
        }
    }
});