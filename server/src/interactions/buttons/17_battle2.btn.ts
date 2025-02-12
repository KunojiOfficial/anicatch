import { InteractionReplyOptions } from "discord.js";
import Interactable from "../../classes/Interactable";
import launchActivity from "../../mechanics/launchActivity";

export default new Interactable({
    id: 17,
    dontReply: true,
    async execute(interaction): Promise<InteractionReplyOptions> {
        const { client, args, player } = interaction;
        let [ timeoutId, timeout2Id, cardId ] = args;
        timeoutId = parseInt(timeoutId), timeout2Id = parseInt(timeout2Id), cardId = parseInt(cardId);

        clearTimeout(timeoutId);
        clearTimeout(timeout2Id);
        
        let card = await client.db.cardInstance.findFirst({
            where: { id: cardId, status: "WILD", userId: player.data.id }
        });

        if (!card) throw 5; //card doesnt exist

        let team = await client.db.cardInstance.findFirst({
            where: { userId: player.data.id, team: { gt: 0 }, status: "IDLE" }
        })

        if (!team) throw 5; //team be

        let battle = await client.db.battle.findFirst({
            where: { OR: [{ userId1: player.data.id }, { userId2: player.data.id }], status: "ACTIVE" }
        });

        if (!battle) battle = await client.db.battle.create({
            data: { 
                userId1: player.data.id,
                userId2: cardId,
                cardId1: team.id,
                cardId2: card.id,
                type: "PVE",
                users: { connect: { id: player.data.id } },
                cards: { connect: [{ id: team.id }, { id: card.id }] }
            }
        });

        await launchActivity(interaction);

        return {}
    }
});