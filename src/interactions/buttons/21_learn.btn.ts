import { InteractionReplyOptions } from "discord.js";

import Interactable from "../../classes/Interactable.ts";
import Card from "../../classes/Card.ts";

export default new Interactable({
    id: 21,
    async execute(interaction): Promise<InteractionReplyOptions> {
        const { client, args, player } = interaction;
        let [ action, cardId, slot, moveId, currency ] = args;
        
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
            const move = await client.db.move.findFirst({ where: { id: moveId } });
            if (!move) throw 61;

            const card = new Card({ card: animon });

            if (animon.moves[slot-1]) throw 62;
            if (move.requiredLevel > card.getLevel()) throw 63;

            if (animon.moves.find(move => move.id === moveId)) throw 64;
            
            if (currency === "coins" && player.data.coins < move.coins) throw 9;
            if (currency === "gems" && player.data.gems < move.gems) throw 10;

            if (currency !== "coins" && currency !== "gems") throw "invalid_currency";

            await client.db.$transaction(async tx => {
                await tx.user.update({ where: { id: player.data.id }, data: { [currency]: { decrement: move[currency] } } });
                await tx.cardInstance.update({ where: { id: cardId }, data: { moves: { connect: { id: moveId } } } });
            });

            interaction.player.data[currency] -= move[currency];

            desc = `{locale_main_taughtMove}`;
            variables = { move: [`**${move.name}**`] };
        }

        const panel = await client.panels.get("moves")!.execute!(interaction, cardId, slot);

        return {
            ...panel,
            embeds: [ ...panel.embeds, interaction.components.embed({
                description: `{emoji_yes}\u2800${desc}`,
                color: "#00FF00"
            }, variables) ]
        };
    }
});