import { InteractionReplyOptions } from "discord.js";
import Interactable from "../classes/Interactable";
import _catch from "../mechanics/catch";

export default new Interactable({
    id: 1,
    async execute(interaction): Promise<InteractionReplyOptions> {
        const { args, client, player } = interaction;
        const [ cardId, ballId, timeoutId, embedTimeoutId ] = args;

        const [ ball, card ] = await Promise.all([
            client.db.inventory.findUnique({ where: { itemId_userId: { itemId: parseInt(ballId), userId: player.data.id }, count: { gte: 1 } }, include: { item: true } }),
            client.db.cardInstance.findFirst({ where: { userId: player.data.id, id: parseInt(cardId), status: "WILD" } })
        ])

        if (!ball) throw 4;
        if (!card) throw 5;
        
        clearTimeout(parseInt(embedTimeoutId));
        clearTimeout(parseInt(timeoutId));

        const captured = await _catch(interaction, card, ball);

        return {
            content: captured.toString()
        };
    }
})