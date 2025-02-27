import { InteractionReplyOptions } from "discord.js";
import Interactable from "../../classes/Interactable";
import launchActivity from "../../mechanics/launchActivity";
import Card from "src/classes/Card";

export default new Interactable({
    id: 18,
    dontReply: true,
    async execute(interaction): Promise<InteractionReplyOptions> {
        const { client, args, player } = interaction;
        let [ challengerId ] = args;
        challengerId = parseInt(challengerId);
        
        const enemyPlayer = await client.db.user.findFirst({ where: { id: challengerId } });
        if (!enemyPlayer) throw 7;

        const [battle, enemyBattle] = await Promise.all([
            client.db.battle.findFirst({ where: { OR: [{ userId1: player.data.id }, { userId2: player.data.id }], status: "ACTIVE" } }),
            client.db.battle.findFirst({ where: { OR: [{ userId1: challengerId }, { userId2: challengerId }], status: "ACTIVE" } })
        ]);

        if (battle) throw 54;
        if (enemyBattle) throw 57;

        const [team, enemyTeam] = await Promise.all([
            client.db.cardInstance.findMany({where: { userId: player.data.id, team: { gt: 0 }, status: "IDLE" }, include: { card: { include: { character: true } }, ball: true }, orderBy: { team: "asc" }}),
            client.db.cardInstance.findMany({where: { userId: challengerId, team: { gt: 0 }, status: "IDLE" }, include: { card: { include: { character: true } }, ball: true }, orderBy: { team: "asc" }})
        ]);

        if (!team.length) throw 55; //team dead or empty
        if (!enemyTeam.length) throw 58; //enemy team dead or empty

        const newBattle = await client.db.$transaction(async tx => {
            await tx.cardInstance.updateMany({ where: { OR: [{ userId: player.data.id }, { userId: challengerId }], team: { gt: 0 }, status: "IDLE" }, data: { status: "FIGHT" } });
            return await tx.battle.create({
                data: {
                    userId1: player.data.id,
                    userId2: challengerId,
                    cardId1: team[0].id,
                    cardId2: enemyTeam[0].id,
                    type: "PVP",
                    channelId: interaction.channel.id,
                    messageId: interaction.message.id
                }
            });
        });

        let team1 = "\u2800\n", team2 = "\u2800\n";
        
        for (const card of team) {
            const cardObj = new Card({ card: card, parent: card.card, character: card.card.character, ball: card.ball, client: client });
            team1 += cardObj.getLabel() + "\n\n";
        }

        for (const card of enemyTeam) {
            const cardObj = new Card({ card: card, parent: card.card, character: card.card.character, ball: card.ball, client: client });
            team2 += cardObj.getLabel() + "\n\n";
        }

        await Promise.all([
            launchActivity(interaction),
            interaction.message.edit({
                embeds: [ interaction.components.embed({
                    description: `Battle between <@${player.data.discordId}> and <@${enemyPlayer.discordId}> in progress...`,
                    fields: [
                        { name: `${player.data.username}'s Team`, value: team1, inline: true },
                        { name: "\u2800", value: "\u2800", inline: true },
                        { name: `${enemyPlayer.username}'s Team`, value: team2, inline: true }
                    ]
                }) ],
                components: [ interaction.components.buttons([{
                    id: '19',
                    owner: '0',
                    label: "View Battle",
                    emoji: "wyes"
                }]) ]
            })
        ]);

        return {};
    }
});