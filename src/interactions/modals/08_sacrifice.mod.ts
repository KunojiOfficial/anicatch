import { InteractionReplyOptions } from "discord.js";
import Interactable from "../../classes/Interactable.ts";
import Card from "../../classes/Card.ts";

export default new Interactable({
    id: 8,
    async execute(interaction): Promise<InteractionReplyOptions> {
        const { client, player } = interaction;
        let [ id ] = interaction.args; 

        id = parseInt(id);
        if (isNaN(id)) return {};

        let sacrifice: string = interaction.fields.getTextInputValue("sacrifice") || null;
        if (!sacrifice) return {};

        const [ cardId, print ] = sacrifice.split("-"); //for human ID system as ABC-123       

        if (!id || !cardId || !print) throw 8;
        let where = { cardId: client.getIdReverse(cardId.toUpperCase()), print: parseInt(print) };

        const card = await client.db.cardInstance.findFirst({
            where: { id: id, userId: player.data.id },
            include: { card: true }
        });

        if (!card) throw 5;

        const cardInstance = new Card({ card: card, parent: card.card });
        await cardInstance.evolve(client.db, where);

        const panel = await client.panels.get("animon").execute(interaction, id, false, "stats", "generateImage");
        return panel;
    }
})