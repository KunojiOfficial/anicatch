import { InteractionReplyOptions } from "discord.js";
import Interactable from "../../classes/Interactable.ts";

export default new Interactable({
    id: 2,
    async execute(interaction): Promise<InteractionReplyOptions> {
        const { fields, args, player, client } = interaction;

        let [ slotId ] = args;
        slotId = parseInt(slotId);

        let field = fields.getTextInputValue("test").toUpperCase();
        let [ cardId, print ] = field.split("-"); //for human ID system as ABC-123       

        if (!cardId || !print) throw 8;
        let where = { cardId: client.getIdReverse(cardId), print: parseInt(print) };
        if (isNaN(where.print)) throw 8;

        const card = await client.db.cardInstance.findFirst({ where: { ...where, userId: player.data.id, team: 0 } });
        if (!card) throw 5;

        const slot = await client.db.cardInstance.findFirst({ where: { userId: player.data.id, team: slotId } });
        if (slot) throw 31;

        await client.db.cardInstance.updateMany({ where: { ...where, userId: player.data.id, team: 0  }, data: { team: slotId} });

        return await client.panels.get("team")!.execute!(interaction, slotId);
    }
})