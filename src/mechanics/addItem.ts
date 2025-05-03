import { PrismaClient } from "@prisma/client";

export default async function addItem(db: PrismaClient, userId: number, itemId: number, amount: number) {
    const item = await db.item.findFirst({ where: { id: itemId } });
    if (!item) return false;

    const upserted = await db.inventory.upsert({
        where: { itemId_userId: { itemId: itemId, userId: userId } },
        update: { count: { increment: amount } },
        create: {
            itemId: itemId, 
            userId: userId,
            count: amount,
        }
    });

    return upserted;
}