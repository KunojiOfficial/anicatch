import { InteractionReplyOptions } from "discord.js";
import Interactable from "../../classes/Interactable.ts";

export default new Interactable({
    id: 6,
    async execute(interaction): Promise<InteractionReplyOptions> {
        const { args, client, player } = interaction;
        let [ cardId ] = args;
        cardId = parseInt(cardId);

        const animon = await client.db.cardInstance.findFirst({ where: { id: cardId } });
        if (!animon) throw 5;
        if (animon.userId !== player.data.id) throw 17;
        if (animon.status !== "IDLE") throw 18;

        if (animon.favorite) await client.db.cardInstance.updateMany({ where: { id: cardId },  data: { favorite: false } });
        else await client.db.cardInstance.updateMany({ where: { id: cardId },  data: { favorite: true } });

        return await client.panels.get("animon")!.execute!(interaction, cardId);
    }
})