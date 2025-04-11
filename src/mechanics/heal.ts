import { PrismaClient, User } from "@prisma/client";

const healCost = 5;

async function getHealableCards(db: PrismaClient, userId: number) {
    return await db.cardInstance.count({
        where: { userId: userId, status: { in: ["DEAD", "IDLE"] }, hp: { not: -1 } }
    });
}

async function heal(db: PrismaClient, player: User) {
    const battle = await db.battle.findFirst({ where: { status: "ACTIVE", OR: [{ userId1: player.id }, { userId2: player.id }] } })
    if (battle) throw 70; // in battle 

    const toHeal = await getHealableCards(db, player.id);
    const cost = healCost * toHeal;

    if (player.coins < cost) throw 9;

    let healedCards = 0;
    if (toHeal === 0) return healedCards;
    
    await db.$transaction(async (tx) => {
        const coins = await tx.user.update({
            where: { id: player.id, coins: { gte: cost } },
            data: { coins: { decrement: cost } }
        });

        const healed = await tx.cardInstance.updateMany({
            where: { userId: player.id, status: { in: ["DEAD", "IDLE"] }, hp: { not: -1 } },
            data: { status: "IDLE", hp: -1 }
        });

        healedCards = healed.count;
    });

    return healedCards;
}

export { heal, healCost, getHealableCards };