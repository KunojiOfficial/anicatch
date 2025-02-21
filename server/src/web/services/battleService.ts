import { PrismaClient } from '@prisma/client';
import Card from '../../classes/Card';

import rarities from "../../data/rarities.json";
import types from "../../data/types.json";
import Battle from 'src/classes/Battle';

const prisma = new PrismaClient();
const client: any = { data: { rarities: rarities, types: types } };


async function getBattle(discordId: string) {

    const battle = await prisma.battle.findFirst({
        where: { status: "ACTIVE", users: { some: { discordId } } },
        include: { cards: { include: { moves: true, stat: true, card: { include: { character: true } } } }, users: true }
    });

    if (!battle) throw new Error("Battle not found");

    const cardsWithDetails = await Promise.all(
        battle.cards.map(async (card) => {
            const cardObj = new Card({ card, parent: card.card, character: card.card.character, stats: card.stat!, client });
            const url = await cardObj.generateCanvas().then((canvas) => canvas?.toDataURL());

            return {
                ...card,
                maxHp: cardObj.getMaxHealth(),
                level: cardObj.getLevel(),
                url
            };
        })
    ).catch((error) => {
        console.error("Error getting battle cards:", error);
        throw new Error("Error getting battle cards");
    });
    
    battle.cards = cardsWithDetails;

    if (battle.type === "PVE" && battle.move1 && !battle.move2)  {
        try {
            const battleObject = new Battle(battle, battle.cardId2);
            await battleObject.enemyAI();
        } catch (error) {
            console.error("Error in enemy AI:", error);
            throw new Error("Error in enemy AI");
        }
    }

    return { ...battle, urls: cardsWithDetails.map(card => card.url) };
}

async function setMove(discordId: string, moveId: number) {
    const battle = await prisma.battle.findFirst({
        where: { status: "ACTIVE", users: { some: { discordId } } },
        include: { cards: { include: { moves: true, stat: true, card: true } }, users: true }
    });

    if (!battle) throw new Error("Battle not found");

    const userId = battle.users.find((user: any) => user.discordId === discordId).id;
    
    const battleObject = new Battle(battle, userId);
    await battleObject.move("move", moveId);

    return {  };
}

export { getBattle, setMove };