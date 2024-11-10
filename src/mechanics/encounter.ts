import { getRandomNumber } from "../helpers/utils";
import { DiscordInteraction } from "../types";

function getRandomRarity(rarities: any) {
    const randomNum = Math.random() * 100;
    let cumulativeChance = 0;

    for (const key in rarities) {
        cumulativeChance += rarities[key].chance;
        if (randomNum <= cumulativeChance) {
            return key;
        }
    }
}

export default async function(interaction: DiscordInteraction) {
    const { client, player } = interaction;

    return await client.db.$transaction(async tx => {

        if (player.data.encounters < 1) throw 6;

        await tx.user.updateMany({ where: { id: player.data.id }, data: { encounters: { decrement: 1 } } });
        
        const rowCount = await tx.cardCatalog.count();
        const randomOffset = Math.floor(Math.random() * rowCount);

        const [result] = await tx.cardCatalog.findMany({ skip: randomOffset, take: 1, include: { character: true } });

        const rarity = getRandomRarity(client.data.rarities);
        // const rarity = "6";

        await tx.cardCatalog.updateMany({ where: { id: result.id }, data: { count: { increment: 1 } } });

        const card = await tx.cardInstance.create({ data: {
            userId: player.data.id,
            fatherId: player.data.id,
            cardId: result.id,
            rarity: parseInt(rarity!),
            print: result.count+1,
        } });

        await tx.stat.create({ data: {
            cardId: card.id,
            vit: getRandomNumber(1, 20),
            def: getRandomNumber(1, 20),
            pow: getRandomNumber(1, 20),
            agi: getRandomNumber(1, 20),
            spi: getRandomNumber(1, 20),
            res: getRandomNumber(1, 20)
        } });

        const timeoutId = setTimeout(async () => {
            await client.db.cardInstance.deleteMany({ where: { id: card.id, status: "WILD" } })
        }, 1000 * 16);

        return {
            rarity: client.data.rarities[rarity as keyof typeof client.data.rarities],
            result: result,
            insert: card,
            timeout: timeoutId
        };

    });
}