import { AttachmentBuilder, inlineCode, InteractionReplyOptions } from "discord.js";
import { Button, DiscordInteraction } from "../types.ts";
import Panel from "../classes/Panel.ts";
import Battle from "../classes/Battle.ts";

function moveSelect(interaction: DiscordInteraction, battleInstance: Battle) {

    return {
        text: "Select a move",
        components: [ interaction.components.buttons([{
            label: "Move"
        }, {
            label: "Item"
        }, {
            label: "Team"
        }, {
            label: "Run"
        }]) ]
    }
}

export default new Panel({
    name: "battle",
    async execute(interaction: DiscordInteraction): Promise<InteractionReplyOptions> {
        const { client, player } = interaction;

        // Get the active battle
        const battle = await client.db.battle.findFirst({
            where: { OR: [{ userId1: player.data.id }, { userId2: player.data.id }], status: "ACTIVE" }
        });

        // If no active battle, throw an error
        if (!battle) throw 27;

        // Create a new Battle instance
        const battleInstance = new Battle(battle, player.data.id);

        let messageData: any = {};

        // If no move has been selected, show the move selection
        if (!battleInstance.isMoveSelected()) messageData = moveSelect(interaction, battleInstance);

        // Generate the canvas
        const canvas = await battleInstance.generateCanvas();
        const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: "battle.jpg" });

        // Get the user instances
        let users = [];
        if (battleInstance.battle.type === "PVP") {
            const opponent = battleInstance.getOpponent();
            
            const opponentUser = await client.db.user.findFirst({ where: { id: opponent } });
            if (!opponentUser) throw "Opponent not found";

            let opponentDiscord = await client.users.fetch(opponentUser.discordId);
            if (!opponentDiscord) opponentDiscord = { displayName: "???" } as any;

            if (battle.userId1 === player.data.id) users = [ player.user, opponentDiscord ];
            else users = [ opponentDiscord, player.user ];
        } else {
            users = [ player.user, client.user as any ];
        }

        const fields = [], buttons: Button[][] = [];
        for (let i = 0; i < battleInstance.activeCards.length; i++) {
            let text = battleInstance.activeCards[i].getShorterLabel();
            text += "\n{emoji_empty} {emoji_empty} " + battleInstance.activeCards[i].getHealthBar(8);
            text += `\n-# \u2800\u2800\u2800\u2800\u2800{number_${battleInstance.activeCards[i].getCurrentHealth()}} / {number_${battleInstance.activeCards[i].getMaxHealth()}}`;
            text += "\n\n";

            const isMoveSelected = battleInstance.battle["move" + (i+1)];

            if (isMoveSelected) {
                text += "*{locale_main_moveSelected}*"
            }
            else {
                text += "*{locale_main_moveWaiting}*";
            }

            if (i < 1 || battle.type !== "PVE") buttons.push();

            fields.push({
                name: "\u2800",
                value: text,
                inline: true
            });

        }

        const defaults = {
            id: "22",
            owner: users.map(u => u.id).join("+"),
            cooldown: { id: "battleAction", time: 5 }
        }

        return {
            embeds: [
                interaction.components.embed({
                    description: "Kei Tsukishima used **Tackle**!\nIt's super effective!\n" + "\u2800".repeat(53),
                    fields: [
                        fields[0],
                        { name: "\u2800", value: "\u2800", inline: true },
                        fields[1]
                    ]
                }, {
                    trainer: [ `${users[0]}`, `${users[1]}` ]
                })
            ],
            components: [interaction.components.buttons([{
                ...defaults,
                label: "\u2800{locale_main_move}",
                emoji: "move",
                args: { action: "move", id: battle.id }
            }, {
                ...defaults,
                label: "\u2800{locale_main_item}",
                emoji: "item",
                args: { action: "item", id: battle.id }
            }, {
                ...defaults,
                label: "\u2800{locale_main_team}",
                emoji: "whBall",
                args: { action: "team", id: battle.id }
            }, {
                ...defaults,
                label: "\u2800{locale_main_forfeit}",
                emoji: "forfeit",
                args: { action: "forfeit", id: battle.id }
            }])],
            files: [attachment]
        }
    }
}); 