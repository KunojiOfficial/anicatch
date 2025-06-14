import Card from "../classes/Card";
import { DiscordInteraction } from "../types.ts";

interface Property {
    effect: "HEAL" | "REVIVE" | "LEVELUP",
    value: number
}

export default async function(interaction: DiscordInteraction, itemId: number, cardId: number, count: number, inFight?: boolean) {
    const { client, player } = interaction;

    const [ item, card ] = await Promise.all([
        client.db.inventory.findFirst({ where: { itemId: itemId, userId: player.data.id, count: { gt: 0 } }, include: { item: true } }),
        client.db.cardInstance.findFirst({ where: { id: cardId, userId: player.data.id, status: { in: [ "IDLE", "DEAD", "FIGHT" ] } } })
    ]);

    if (!item) throw 24; if (!card) throw 5;
    if (!inFight && card.status === "FIGHT") throw 56;

    const properties = item.item.properties as any as Property;
    const cardData = new Card({ card: card });

    await client.db.$transaction(async tx => {
        switch (properties.effect) {
            case "LEVELUP":
                if (cardData.getLevel()+(count*properties.value) > cardData.rarity.maxLevel) throw 32;
                
                const requiredExp = cardData.getExpForExactLevelUps(count*properties.value);
                await tx.cardInstance.updateMany({ where: { id: card.id }, data: { exp: requiredExp } });
                break;
            case "REVIVE":
                if (card.status !== "DEAD") throw 33;
                count = 1;

                const hp = Math.floor((cardData.maxHealth)*properties.value);
                await tx.cardInstance.update({ where: { id: card.id }, data: { status: inFight ? "FIGHT" : "IDLE", hp: hp } });
                break;
            case "HEAL":
                if (card.status === "DEAD") throw 34;
                
                let maxHp = cardData.maxHealth;
                let currentHp = cardData.currentHealth;
                if (currentHp === maxHp) throw 36;
                
                let maxCount = 0;
                let healValue = Math.floor(maxHp*(properties.value/100));

                while (currentHp < maxHp) {
                    maxCount++;
                    currentHp += healValue;
                }
                
                
                count = Math.min(maxCount, count);
                let newHp = Math.floor(Math.min(cardData.maxHealth, cardData.currentHealth+(count*healValue)));
                if (newHp >= maxHp) newHp = -1;
                
                await tx.cardInstance.update({ where: { id: card.id }, data: { hp: newHp } });

                break;
        }
        
        await tx.inventory.updateMany({ where: { itemId: itemId, userId: player.data.id }, data: { count: { decrement: count } } });
        await tx.log.create({ data: { userId: player.data.id, action: "consumable", description: `uses ${item.itemId} x${count} on ${cardId}` } });
    });

    return item;
}