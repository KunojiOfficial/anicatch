import { InteractionReplyOptions } from "discord.js";

import Interactable from "../../classes/Interactable.ts";
import Card from "../../classes/Card.ts";

export default new Interactable({
    id: 21,
    async execute(interaction): Promise<InteractionReplyOptions> {
        const { client, args, player } = interaction;
        let [ action, cardId, slot, moveId ] = args;
        
        cardId = parseInt(cardId);
        slot = parseInt(slot);
        moveId = parseInt(moveId);

        if (isNaN(slot) || isNaN(moveId) || isNaN(cardId)) throw "nan";

        const animon = await client.db.cardInstance.findFirst({ where: { id: cardId, userId: player.data.id }, include: { moves: true } });
        if (!animon) throw 59;
        if (animon.status !== "IDLE") throw 18;

        let desc = "", variables = {};
        if (animon.moves.find(move => move.id === moveId) && action === "remove") {
            desc = `{locale_main_removedMove}`;
            variables = { move: [`**${animon.moves[slot-1].name}**`], slot: [slot] };
            await client.db.cardInstance.update({ where: { id: cardId }, data: { moves: { disconnect: { id: animon.moves.find(move => move.id === moveId).id } } } });
        } else if (action === "learn") {
            const move = await client.db.moveInventory.findFirst({ where: { moveId: moveId, userId: player.data.id, count: {gt: 0} }, include: { move: true } });
            if (!move) throw 61;

            const card = new Card({ card: animon });

            if (animon.moves[slot-1]) throw 62;
            if (move.move.requiredLevel > card.getLevel()) throw 63;
            if (animon.moves.find(move => move.id === moveId)) throw 64;

            await client.db.$transaction(async tx => {
                await tx.moveInventory.updateMany({ where: { userId: player.data.id, moveId: moveId }, data: { count: { decrement: 1 } } });
                await tx.cardInstance.update({ where: { id: cardId }, data: { moves: { connect: { id: moveId } } } });
            });

            desc = `{locale_main_taughtMove}`;
            variables = { move: [`**${move.move.name}**`] };
        }

        const panel = await client.panels.get("animon")!.execute!(interaction, cardId, false, "moves");

        return panel;
    }
});