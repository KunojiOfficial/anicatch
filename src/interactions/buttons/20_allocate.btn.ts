import { InteractionReplyOptions } from "discord.js";
import Interactable from "../../classes/Interactable.ts";
import Card from "../../classes/Card.ts";

export default new Interactable({
    id: 20,
    async execute(interaction): Promise<InteractionReplyOptions> {
        const { client, args, player } = interaction;
        let [ cardId, points, stat ] = args;
        
        cardId = parseInt(cardId);
        points = parseInt(points);

        const animon = await client.db.cardInstance.findFirst({ where: { id: cardId, userId: player.data.id } });
        if (!animon) throw 59;
        if (animon.status !== "IDLE") throw 18;

        const card = new Card({ card: animon });
        const availablePoints = card.getStatPoints();

        if (points > availablePoints || points < 1) throw 60;

        await client.db.cardInstance.update({ where: { id: cardId }, data: { [stat]: { increment: points } } });

        const panel = await client.panels.get("animon")!.execute!(interaction, cardId, false, "stats", points);
        return panel;
    }
});