import Card from '../../classes/Card';

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

import rarities from "../../data/rarities.json";
import types from "../../data/types.json";

const client: any = { data: { rarities: rarities, types: types } };

export async function getBattle(discordId: string) {

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
    );

    battle.cards = cardsWithDetails;

    return { ...battle, urls: cardsWithDetails.map(card => card.url) };
}
