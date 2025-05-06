import { InteractionReplyOptions } from "discord.js";
import Interactable from "../../classes/Interactable.ts";
import Card from "../../classes/Card.ts";

export default new Interactable({
    id: 27,
    async execute(interaction): Promise<InteractionReplyOptions> {
        const { client, player } = interaction;
        let [ id ] = interaction.args; 

        id = parseInt(id);
        if (isNaN(id)) return {};

        const card = await client.db.cardInstance.findFirst({
            where: { id: id, userId: player.data.id },
            include: { card: true }
        });

        if (!card) throw 5;

        const cardInstance = new Card({ card: card, parent: card.card });
        await cardInstance.ascend(client.db);

        const panel = await client.panels.get("animon").execute(interaction, id, false, "stats", "generateImage");
        
        return panel;
    }
})