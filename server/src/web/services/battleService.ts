import { PrismaClient } from '@prisma/client';
import Card from '../../classes/Card';

import rarities from "../../data/rarities.json";
import types from "../../data/types.json";
import Battle from 'src/classes/Battle';

import { db } from 'index';

import locale from '../../locale/items/en-US.json';

const client: any = { data: { rarities: rarities, types: types } };

function extractNumericValue(str: string): string {
    const match = str.match(/\d+/);
    return match ? match[0] : '';
}

async function fetchBattle(userId: number) {
    const battle = await db.battle.findFirst({
        where: { status: "ACTIVE", OR: [{ userId1: userId }, { userId2: userId }] },
    });

    if (!battle) throw new Error("Battle not found");

    return battle;
}

async function getBattle(userId: number) {
    const battle = await fetchBattle(userId);

    let users = await db.user.findMany({
        where: { OR: [{ id: battle.userId1 }, { id: battle.userId2 }] },
        include: { 
            cards: { where: { team: { gt: 0 } }, include: { card: { include: { character: true } }, stat: true, moves: true } },
        }
    });

    if (users.length !== 2) {
        let aiUser = { 
            username: "AI", 
            cards: await db.cardInstance.findMany({ where: { id: battle.cardId2 }, include: { card: { include: { character: true } }, stat: true, moves: true } })
        };

        users = [...users, aiUser as any ]; 
    }

    let items = [];
    for (const user of users as any) {
        if (user.id == userId) {
            items = await db.inventory.findMany({ where: { userId: user.id, item: { type: "CONSUMABLE" }}, include: { item: true }});
            items = items.map((item) => {
                return {
                    id: item.itemId,
                    name: locale[item.item.name].name,
                    img: item.item.name
                };
            });
        }

        for (const card of user.cards) {
            if (card.id !== battle.cardId1 && card.id !== battle.cardId2) continue;
            
            const cardObj = new Card({ card, parent: card.card, character: card.card.character, stats: card.stat, moves: card.moves, client });
            card.url = await cardObj.generateCanvas().then((canvas) => canvas?.toDataURL());
            card.maxHp = cardObj.getMaxHealth();
            card.level = cardObj.getLevel();
        }
    }

    return {
        battle,
        user1: users.find((user: any) => user.id === userId),
        user2: users.find((user: any) => user.id !== userId),
        items: items
    };
}


async function setMove(userId: number, moveId: number) {
    const battle = await fetchBattle(userId);

    const battleObject = new Battle(battle, userId);
    await battleObject.selectAction("move", {moveId, userId});

    return {  };
}

async function switchCard(userId: number, cardId: number) {
    const battle = await fetchBattle(userId);

    const battleObject = new Battle(battle, userId);
    await battleObject.selectAction("switch", {cardId});

    return { };
}

async function useItem(userId: number, cardId: number, itemId: number) {
    const battle = await fetchBattle(userId);

    const battleObject = new Battle(battle, userId);
    await battleObject.selectAction("item", {cardId, itemId});

    return { };
}

async function run(userId: number) {
    const battle = await fetchBattle(userId);

    const battleObject = new Battle(battle, userId);
    await battleObject.selectAction("run", {});

    return { };
}

export { getBattle, setMove, switchCard, useItem, run };