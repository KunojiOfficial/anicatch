import { InteractionReplyOptions } from "discord.js";
import Interactable from "../../classes/Interactable.ts";
import launchActivity from "../../mechanics/launchActivity.ts";
import { calculateExpForLevel, calculateLevelFromExp } from "../../mechanics/statsCalculator.ts";

export default new Interactable({
    id: 17,
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
            let team = await client.db.cardInstance.findMany({
                where: { 
                    userId: player.data.id, 
                    team: { gt: 0 }, 
                    status: "IDLE",
                },
                orderBy: { team: "asc" }
            });
    
            if (!team.length) throw 55; //team dead or empty

            clearTimeout(timeoutId);
            clearTimeout(timeout2Id);

            // calculate average level of the team and set stats of the wild animon
            let avgLevel = Math.ceil(team.reduce((acc, card) => acc + calculateLevelFromExp(card.exp), 0) / team.length);
            let availablePoints = (avgLevel-1) * 6;
            
            // randomly distribute the points
            let stats = { vit: 1, def: 1, pow: 1, agi: 1, spi: 1, res: 1 };
            while (availablePoints > 0) {
                let stat = Object.keys(stats)[Math.floor(Math.random() * 6)];
                stats[stat]++;
                availablePoints--;
            }

            battle = await client.db.$transaction(async tx => {
                await tx.cardInstance.updateMany({ where: { userId: player.data.id, team: { gt: 0 }, status: "IDLE" }, data: { status: "FIGHT" } });
                await tx.cardInstance.update({ where: { id: card.id, status: "WILD" }, data: { status: "WILD_FIGHT", ...stats, exp: calculateExpForLevel(avgLevel) } });
                return await tx.battle.create({
                    data: { 
                        userId1: player.data.id,
                        userId2: cardId,
                        cardId1: team[0].id,
                        cardId2: card.id,
                        type: "PVE",
                        channelId: interaction.channel.id,
                        messageId: interaction.message.id
                    }
                });
            });
        } else {
            await interaction.channel.send({
                embeds: [ interaction.components.embed({
                    description: `{locale_main_warningInBattle}`
                }, {
                    user: [ `${player.user}` ]
                }) ]
            });
        }

        const panel = await client.panels.get("battle")?.execute(interaction);
        // await interaction.editReply(panel);

        return panel;
    }
});