import { InteractionReplyOptions } from "discord.js";
import Interactable from "../../classes/Interactable.ts";
import launchActivity from "../../mechanics/launchActivity.ts";
import Card from "../../classes/Card.ts";

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
            const cardObj = new Card({ card: card, parent: card.card, character: card.card.character });
            team1 += cardObj.getShortLabel() + "\n";
        }

        for (const card of enemyTeam) {
            const cardObj = new Card({ card: card, parent: card.card, character: card.card.character });
            team2 += cardObj.getShortLabel() + "\n";
        }

        await Promise.all([
            launchActivity(interaction),
            interaction.message.edit({
                embeds: [ interaction.components.embed({
                    description: `{locale_main_battleInProgress}`,
                    fields: [
                        { name: `{locale_main_usersTeam}`, value: team1, inline: true },
                        { name: "\u2800", value: "\u2800", inline: true },
                        { name: `{locale_main_usersTeam}`, value: team2, inline: true }
                    ]
                }, {
                    user1: [ `<@${player.data.discordId}>`],
                    user2: [ `<@${enemyPlayer.discordId}>`],
                    username: [ player.data.username, enemyPlayer.username ]
                }) ],
                components: []
            }),
            interaction.message.reply({
                content: `<@${enemyPlayer.discordId}>`,
                embeds: [ interaction.components.embed({
                    description: `{locale_main_joinTheBattle}`
                })],
                components: [ interaction.components.buttons([{
                    id: '19',
                    owner: '0',
                    label: "{locale_main_joinBattle}",
                    emoji: "wyes"
                }]) ]
            })
        ]);

        return {};
    }
});