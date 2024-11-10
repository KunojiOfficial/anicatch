import { InteractionReplyOptions } from "discord.js";
import Interactable from "../../classes/Interactable";
import consumable from "../../mechanics/consumable";

export default new Interactable({
    id: 3,
    async execute(interaction): Promise<InteractionReplyOptions> {
        const { fields, args, player, client } = interaction;

        let [ itemId, count ] = args;
        itemId = parseInt(itemId), count = parseInt(count);

        let field = fields.getTextInputValue("cardId").toUpperCase();
        let [ cardId, print ] = field.split("-"); //for human ID system as ABC-123       

        if (!cardId || !print) throw 8;
        let where = { cardId: client.getIdReverse(cardId), print: parseInt(print) };

        if (isNaN(where.print)) throw 8;

        const card = await client.db.cardInstance.findFirst({ where: { ...where, userId: player.data.id } });
        if (!card) throw 5;

        const item = await consumable(interaction, itemId, card.id, count);

        const message = await client.panels.get("inventory")!.execute!(interaction, item.count-count > 0 ? item.item.type : "main", itemId, count);

        return {
            ...message,
            embeds: [ ...message.embeds!, interaction.components.embed({
                description: `{locale_main_useSuccess}`
            }, {
                name: [`${item.item.emoji} **${item.item.name}**`],
                count: [`**${count}**`]
            }) ]
        }
    }
})