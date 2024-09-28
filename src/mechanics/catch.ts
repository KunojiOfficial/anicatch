import { CardInstance, Item, Prisma } from "@prisma/client";
import { DiscordInteraction } from "../types";

function calculateCatchChance(ball: Item, card: CardInstance) {
    if (!ball.properties) return 0;

    const props = ball.properties as any;
    const baseCatchRates = props.baseCatchRates;
    const typeBonuses = props.typeBonuses;
    
    // Get the base catch rate for the character's rarity
    let baseRate = baseCatchRates[card.rarity];
    
    // Apply type bonus if applicable
    if (typeBonuses) {
        // baseRate += typeBonuses[ball.type];
    }
    
    // Ensure catch rate is capped at 1 (100%)
    return Math.min(baseRate, 1);
}

type InventoryWithItem = Prisma.InventoryGetPayload<{
    include: { item: true }
}>;

export default async function(interaction: DiscordInteraction, card: CardInstance, ball: InventoryWithItem) {
    const { client, player } = interaction;

    return await client.db.$transaction(async tx => {
        //take the ball away :)
        await tx.inventory.update({ 
            where: { itemId_userId: { itemId: ball.itemId, userId: player.data.id }, count: { gte: 1 } },
            data: { count: { decrement: 1 } }
        });

        //get chance of catching
        const chance = calculateCatchChance(ball.item, card);
        const roll = Math.random();
        
        if (roll < chance) { //success
            await tx.cardInstance.update({ where: { id: card.id }, data: { status: "IDLE", ballId: ball.itemId } });
            return true;
        } else {
            await tx.cardInstance.deleteMany({ where: { id: card.id } });
            return false;
        }   
    });
}