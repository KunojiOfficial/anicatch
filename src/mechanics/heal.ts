import { PrismaClient } from "@prisma/client";

export default async function heal(db: PrismaClient, userId: number) {
    const battle = await db.battle.findFirst({ where: { status: "ACTIVE", OR: [{ userId1: userId }, { userId2: userId }] } })
    if (battle) throw 70; // in battle 

    const healedCards = await db.cardInstance.updateMany({
        where: { userId: userId, status: { in: ["DEAD", "IDLE"] }, hp: { not: -1 } },
        data: { status: "IDLE", hp: -1 }
    });

    return healedCards.count;
}