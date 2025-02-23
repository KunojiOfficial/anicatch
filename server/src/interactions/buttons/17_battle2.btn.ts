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
        
        let card = await client.db.cardInstance.findFirst({
            where: { id: cardId, status: "WILD", userId: player.data.id }
        });

        if (!card) throw 5; //card doesnt exist

        let battle = await client.db.battle.findFirst({
            where: { OR: [{ userId1: player.data.id }, { userId2: player.data.id }], status: "ACTIVE" }
        });

        if (!battle) {
            let team = await client.db.cardInstance.findFirst({
                where: { 
                    userId: player.data.id, 
                    team: { gt: 0 }, 
                    status: "IDLE",
                    stat: { OR: [{ hp: -1 }, { hp: { gt: 0 } }] }
                },
                include: { stat: true },
                orderBy: { team: "asc" }
            })
    
            if (!team) throw 55; //team dead or empty

            clearTimeout(timeoutId);
            clearTimeout(timeout2Id);

            battle = await client.db.$transaction(async tx => {
                await tx.cardInstance.update({ where: { id: team.id, status: "IDLE" }, data: { status: "FIGHT" } });
                await tx.cardInstance.update({ where: { id: card.id, status: "WILD" }, data: { status: "WILD_FIGHT" } });
                return await tx.battle.create({
                    data: { 
                        userId1: player.data.id,
                        userId2: cardId,
                        cardId1: team.id,
                        cardId2: card.id,
                        type: "PVE",
                        users: { connect: { id: player.data.id } },
                        cards: { connect: [{ id: team.id }, { id: card.id }] },
                        channelId: interaction.channel.id,
                        messageId: interaction.message.id
                    }
                });
            });
        } else {
            await interaction.channel.send({
                embeds: [ interaction.components.embed({
                    description: `${player.user}, you are already in a battle!\nProceeding with the current battle...`
                }) ]
            });
        }

        await Promise.all([
            launchActivity(interaction),
            interaction.message.edit({components: []})
        ]);

        return {};
    }
});