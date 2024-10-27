import { InteractionReplyOptions } from "discord.js";
import Interactable from "../../classes/Interactable";

import Card from "../../classes/Card";
import { CardCatalog, CardInstance, Character, Stat } from "@prisma/client";
import { DiscordClient } from "../../types";

interface CardWithData { card: CardInstance, stats: Stat, parent: CardCatalog, client: DiscordClient };

function getValues(attack: string, attacker: Stat, defender: Stat) {
    if (attack === "attack") return Math.max((attacker.pow * 30) - (defender.def * 10), 0) 
    else return Math.max((attacker.spi * 30) - (defender.res * 10), 0) 
}

function getMove(stats: Stat) {
    if (stats.pow > stats.spi) return "attack";
    else return "spirit";
}

function fight(playerCard: CardWithData, enemyCard: CardWithData) {
    let playerHp = playerCard.stats.hp, enemyHp = enemyCard.stats.hp;
    enemyCard.card.exp = playerCard.card.exp;

    let playerData = new Card({ ...playerCard }), enemyData = new Card({ ...enemyCard });
    let playerStats: Stat = playerData.getStats() as Stat, enemyStats: Stat = enemyData.getStats() as Stat;

    if (playerHp <= 0) playerHp = playerStats.vit * 100;
    if (enemyHp <= 0) enemyHp = enemyStats.vit * 100;

    let playerBeginHp = playerHp, enemyBeginHp = enemyHp;
    let playerType = playerData.getType(), enemyType = enemyData.getType();
    
    let playerMultiplier = 1;
    if (playerType?.strong.includes(enemyCard.parent.type)) playerMultiplier = 2;
    else if (playerType?.weak.includes(enemyCard.parent.type)) playerMultiplier = 0.5;

    let enemyMultiplier = 1;
    if (enemyType?.strong.includes(playerCard.parent.type)) enemyMultiplier = 2;
    else if (enemyType?.weak.includes(playerCard.parent.type)) enemyMultiplier = 0.5;

    const logs = [];
    while (playerHp > 0 && enemyHp > 0) {
        let playerMove = getMove(playerStats), enemyMove = getMove(enemyStats);
        
        let playerAttackValue = getValues(playerMove, playerStats, enemyStats) * playerMultiplier;
        let enemyAttackValue = getValues(enemyMove, enemyStats, playerStats) * enemyMultiplier;
        
        if (playerCard.stats.agi > enemyCard.stats.agi) { //player attacks first
            logs.push({ who: "player", attack: playerMove, value: playerAttackValue });
            enemyHp -= playerAttackValue;
            if (enemyHp <= 0) break;
            logs.push({ who: "enemy", attack: enemyMove, value: enemyAttackValue });
            playerHp -= enemyAttackValue;
            if (playerHp <= 0) break;
        } else { // enemy attacks first
            logs.push({ who: "enemy", attack: enemyMove, value: enemyAttackValue });
            playerHp -= enemyAttackValue * enemyMultiplier;
            if (playerHp <= 0) break;
            logs.push({ who: "player", attack: playerMove, value: playerAttackValue });
            enemyHp -= playerAttackValue * playerMultiplier;
            if (enemyHp <= 0) break;
        }
    }

    return {logs, playerHp, playerBeginHp, enemyHp, enemyBeginHp};
}

function redactLogs(logs: { who: string, attack: string, value: number }[], playerBeginHp: number, enemyBeginHp: number, player: Character, enemy: Character) {
    let text = `-# **${player.name} HP:** {number_${playerBeginHp}}\u2800 **${enemy.name} HP:** {number_${enemyBeginHp}}\n\n`;

    for (const [index, log] of logs.entries()) {
        if (index > 1 && logs.length>3) {
            text += `-# +${logs.length-3} more actions...\n`;
            let lastLog = logs[logs.length-1];
            text += `-# **${lastLog.who === "player" ? player.name : enemy.name}** used **${lastLog.attack == "spirit" ? "spiritual attack" : "physical attack"}** which resulted in **{number_${lastLog.value}}** damage!\n`;
            break;
        }

        text += `-# **${log.who === "player" ? player.name : enemy.name}** used **${log.attack == "spirit" ? "spiritual attack" : "physical attack"}** which resulted in **{number_${log.value}}** damage!\n`;
    }

    if (logs[logs.length-1].who === "player") text += `-# **${enemy.name}** fainted!`;
    else text += `-# **${player.name}** fainted!`;

    return text.substring(0, 2000);
}

export default new Interactable({
    id: 10,
    async execute(interaction): Promise<InteractionReplyOptions> {
        const { client, args, player } = interaction;
        let [ timeoutId, timeout2Id, cardId ] = args;
        timeoutId = parseInt(timeoutId), timeout2Id = parseInt(timeout2Id), cardId = parseInt(cardId);

        clearTimeout(timeoutId);
        clearTimeout(timeout2Id);
        
        await interaction.editReply({components: []});

        const encounter = await client.db.cardInstance.findFirst({ where: { id: cardId, status: "WILD" }, include: { card: { include: { character: true } }, stat: true } });
        if (!encounter) throw 5;

        const team = await client.db.team.findFirst({ where: { userId: player.data.id } });
        if (!team) throw 28;

        const ids: number[] = [team.slot1,team.slot2,team.slot3,team.slot4,team.slot5].filter(id => id) as number[];
        if (!ids.length) throw 28;

        const teamCards = await client.db.cardInstance.findMany({ where: { id: { in: ids }, status: { in: ["DEAD", "IDLE"] } }, include: { stat: true, card: { include: { character: true } } } });
        if (!teamCards.length) throw 28;

        let firstCard = teamCards.find(c => c.status === "IDLE");
        if (!firstCard) throw 29;

        const rarityDiff = encounter.rarity - firstCard.rarity;

        //simulate the fight
        let {logs, playerHp, playerBeginHp, enemyHp, enemyBeginHp} = fight(
            { card: firstCard, parent: firstCard.card, stats: firstCard.stat!, client: client }, 
            { card: encounter, parent: encounter.card, stats: encounter.stat!, client: client }
        );

        const isWin = playerHp > 0;

        const card = new Card({ card: firstCard, parent: firstCard.card, stats: firstCard.stat!, client: client });
        
        let droppedExp = card.getRequiredExp();
        if (rarityDiff === 0) droppedExp *= 0.4;
        else if (rarityDiff < -2) droppedExp *= 0.1;
        else if (rarityDiff < 0) droppedExp *= 0.2;
        else if (rarityDiff < 2) droppedExp *= 0.5;
        else droppedExp *= 0.7;

        if (!droppedExp || card.rarity?.maxLevel <= card.getLevel()) droppedExp = 0;

        let newLevel, newPercentage;
        await client.db.$transaction(async tx => {
            await tx.cardInstance.delete({ where: { id: cardId, status: "WILD" } });
            
            if (!isWin) await tx.cardInstance.update({ where: { id: firstCard.id }, data: { status: "DEAD", stat: { update: { data: { hp: playerHp } } } } });
            else {
                newLevel = card.getLevel(card.card.exp + droppedExp);
                newPercentage = card.getPercentage(newLevel, card.card.exp + droppedExp);
                
                if (newLevel !== card.getLevel()) playerHp = -1;

                await tx.cardInstance.update({ where: { id: firstCard.id }, data: { exp: { increment: droppedExp }, stat: { update: { data: { hp: playerHp } } }  } });
            }
        });

        let description = `**Battle Logs**\n\n` + redactLogs(logs, playerBeginHp, enemyBeginHp, firstCard.card.character, encounter.card.character);
        if (isWin) {
            description += `\n\n**✅\u2800${firstCard.card.character.name}** has won againt **${encounter.card.character.name}**!`;
            description += `\n-# \u2800\u2800\u2800**Level ${card.getLevel()}** (${card.getPercentage()}%) ➔ **Level ${newLevel}** (${newPercentage}%)`
        
        } else description += `\n\n**❌\u2800${firstCard.card.character.name}** has lost againt **${encounter.card.character.name}**!`;

        return {
            embeds: [{
                ...interaction.message.embeds[0].data,
                description: interaction.message.embeds[0].data.description?.substring(0, interaction.message.embeds[0].description?.indexOf("-#", 3)), 
                image: { url: "attachment://card.jpg" }
            }, interaction.components.embed({
                description: description,
                color: isWin ? "#00ff00" : "#ff0000"
            })],
            components: [ interaction.components.buttons([{
                id: '2',
                label: `Next (${player.data.encounters-1})`,
                emoji: "next",
                cooldown: { id: "next", time: 2 },
                args: { id: -1 },
            }]) ]
        };
    }
});