import { InteractionReplyOptions } from "discord.js";
import Interactable from "../../classes/Interactable.ts";
import consumable from "../../mechanics/consumable.ts";

export default new Interactable({
    id: 13,
    async execute(interaction): Promise<InteractionReplyOptions> {
        const { client, args, player } = interaction;
        let [ cardId, itemId, count ] = args;
        cardId = parseInt(cardId), itemId = parseInt(itemId), count =  parseInt(count);

        const item = await consumable(interaction, itemId, cardId, count);
        const message = await client.panels.get("fastUse")!.execute!(interaction, cardId, itemId, count);

        return message;
    }
});