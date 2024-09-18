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

    const rowCount = await client.db.cardCatalog.count();
    const randomOffset = Math.floor(Math.random() * rowCount);

    const [result] = await client.db.cardCatalog.findMany({ skip: randomOffset, take: 1, include: { character: true } });

    const rarity = getRandomRarity(client.data.rarities);

    const card = await client.db.cardInstance.create({ data: {
        userId: player.data.id,
        cardId: result.id,
        rarity: parseInt(rarity!)
    } });

    const timeoutId = setTimeout(async () => {
        await client.db.cardInstance.deleteMany({ where: { id: card.id, status: "WILD" } }) 
    }, 11 * 1000);

    return {
        rarity: client.data.rarities[rarity as keyof typeof client.data.rarities],
        result: result,
        insert: card,
        timeout: timeoutId
    };
}