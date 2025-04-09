import { AttachmentBuilder, InteractionReplyOptions, User } from "discord.js";
import { Button, DiscordClient, DiscordInteraction, HistoryElement } from "../types.ts";
import Panel from "../classes/Panel.ts";
import Battle from "../classes/Battle.ts";
import Card from "../classes/Card.ts";
import Player from "../classes/Player.ts";

function formatRewards(rewards: any, player: Player, cards: Card[], battle: Battle): object {
    let text = "", variables = {};

    const exp = rewards.exp;
    if (!exp) return {text, variables};
    
    const card = cards.find(c => c.card.id === battle.battle.cardId1);
    if (!card) return {text, variables};

    const coins = rewards.coins || 0;

    text = `\n\n`;
    text += `{locale_battle_exp}\n{locale_battle_coins}`;
    
    variables["exp"] = [`**{number_${exp}}**`];
    variables["coins"] = [`**{number_${coins}}**`];
    variables["animon"] = [`**${card.getName()}**`];

    if (player.role.expShare > 0) {
        text += "\n{locale_battle_expShare}";
        variables["sharedExp"] = [`{number_${Math.floor(player.role.expShare*exp)}}`];
    }

    return {text, variables};
}

async function formatHistory(client: DiscordClient, history: HistoryElement, cards: Card[]): Promise<object> {
    let text = "", variables = {};

    if (!history) return {text, variables};

    const card = cards.find(c => c.card.id === history.cardId);
    if (!card) return {text, variables};
    variables["animon"] = [`**${card.getName()}**`, `**${card.getName()}**`,`**${card.getName()}**`];

    if (history.type === "move") {
        const move = card.moves.find(m => m.id === history.moveId);
        text = `{emoji_move} **${card.getName()}** used **${move.name}**!`;
        text = `{emoji_move} {locale_battle_move}`;

        variables["move"] = [`**${move.name}**`];

        if (history.miss) text += " {locale_battle_miss}";
        else {
            if (history.efectivness && history.efectivness !== 1) text += ` {locale_battle_${history.efectivness}x}`;
            
            if (history.kill > 0) {
                const enemy = await client.db.cardInstance.findFirst({ where: { id: history.kill }, include: { card: { include: { character: true } } } });
                text += ` {locale_battle_kill}`;
                variables["enemy"] = [`**${enemy.card.character.name}**`];
            }

            if (history.defended > 0) text += `\n-# \u2800\u2800 {locale_battle_block}`;
            if (history.damage > 0) text += `\n-# \u2800\u2800 {locale_battle_dealt}`;

            variables["damage"] = [`{number_${history.damage}}`];
            variables["defended"] = [`{number_${history.defended}}`];
        
        }
    } else if (history.type === "switch") {
        text = `{emoji_whBall} {locale_battle_switch}`;
    } else if (history.type === "item") {
        text = `{emoji_item} {locale_battle_item}`;
        variables["item"] = [`**${history.itemData.name}**`];
    } else if (history.type === "fail") {
        text = `{emoji_no} {locale_battle_fail}`;
    } else {
        text = `{emoji_no} {locale_battle_nothing}`;
    }

    return {text, variables};
}

export default new Panel({
    name: "battle",
    async execute(interaction: DiscordInteraction, battleId?: number): Promise<InteractionReplyOptions> {
        const { client, player } = interaction;

        let filter = {};
        if (battleId) filter = { id: battleId };
        else filter = { OR: [{ userId1: player.data.id }, { userId2: player.data.id }], status: "ACTIVE" };

        // Get the active battle
        const battle = await client.db.battle.findFirst({
            where: filter
        });

        // If no active battle, throw an error
        if (!battle) throw 27;

        // Create a new Battle instance
        const battleInstance = new Battle(battle, player.data.id, client);

        // Get cards in fight
        const cards = await client.db.cardInstance.findMany({ where: { userId: { in: [ battle.userId1, battle.userId2 ] }, team: { gt: 0 } }, include: { card: { include: { character: true } }, moves: true }});
        const cardInstances = cards.map(t => new Card({ card: t, parent: t.card, character: t.card.character, moves: t.moves }));

        // Generate the canvas
        const canvas = await battleInstance.generateCanvas();
        const attachment = canvas ? new AttachmentBuilder(canvas.toBuffer(), { name: "battle.jpg" }) : null;

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

            if (battle.status === "ACTIVE") {
                if (isMoveSelected) {
                    text += "*{locale_main_moveSelected}*"
                }
                else {
                    text += "*{locale_main_moveWaiting}*";
                }
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

        let description = "";

        let history1: any = await formatHistory(client, battle.history[battle.history.length-2] as any, [...cardInstances, ...battleInstance.activeCards]);
        let history2: any = await formatHistory(client, battle.history[battle.history.length-1] as any, [...cardInstances, ...battleInstance.activeCards]);

        if (history1.text) description += client.formatText(history1.text, interaction.locale, history1.variables) + "\n";
        if (history2.text) description += client.formatText(history2.text, interaction.locale, history2.variables);
        
        if (battle.status === "ENDED") description += "\n\n" + client.formatText("{locale_battle_end}", interaction.locale, { winner: users[battleInstance.getWinnerIndex()] });
        if (battle.rewards) {
            let rewards: any = await formatRewards(battle.rewards, player, cardInstances, battleInstance);
            if (rewards.text) description += "\n" + client.formatText(rewards.text, interaction.locale, rewards.variables);
        }

        description += "\n" + (fields.length ? "\u2800".repeat(53) : "");

        return {
            content: client.formatText(`[{locale_main_turn} ${battle.turn+1}] ${users[0]} vs ${users[1]}`, interaction.locale),
            embeds: [
                interaction.components.embed({
                    description: description,
                    fields: fields.length ? [
                        fields[0] ?? { name: "\u2800", value: "\u2800", inline: true },
                        { name: "\u2800", value: "\u2800", inline: true },
                        fields[1] ?? { name: "\u2800", value: "\u2800", inline: true }
                    ] : []
                }, {
                    trainer: [ `${users[0]}`, `${users[1]}` ]
                })
            ],
            components: battle.status === "ACTIVE" ? [interaction.components.buttons([{
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
            }])] : [],
            files: attachment ? [attachment] : []
        }
    }
}); 