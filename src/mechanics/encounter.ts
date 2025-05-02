import { DiscordInteraction } from "../types.ts";
import rarities from "../data/rarities.json";
import types from "../data/types.json";

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

interface FledPrint { print: number, rarity: number };

export default async function(interaction: DiscordInteraction) {
    const { client, player } = interaction;

    return await client.db.$transaction(async tx => {

        if (player.data.encounters < 1) throw 6;

        await tx.user.updateMany({ where: { id: player.data.id }, data: { encounters: { decrement: 1 } } });
        
        const rowCount = await tx.cardCatalog.count();
        const randomOffset = Math.floor(Math.random() * rowCount);

        const [result] = await tx.cardCatalog.findMany({ skip: randomOffset, take: 1, include: { character: { include: { series: { select: { english_title: true } } } } } });
        // const [result] = await tx.cardCatalog.findMany({ where: { id: 1 }, include: { character: { include: { series: true } } } });

        let print, rarity;
        if (result.fledPrints.length) { // If there are fled prints, use them
            const fledPrint: FledPrint = result.fledPrints.shift() as any;
            print = fledPrint.print;

            await tx.cardCatalog.update({ where: { id: result.id }, data: { fledPrints: { set: result.fledPrints } } });
        } else { // Otherwise, generate a new card
            print = result.count + 1;

            await tx.cardCatalog.updateMany({ where: { id: result.id }, data: { count: { increment: 1 } } });
        }

        rarity = getRandomRarity(rarities);

        // Find a move that matches the card's type and power
        const moves = types[result.type as keyof typeof types].defaultMoves;

        const card = await tx.cardInstance.create({ data: {
            userId: player.data.id,
            fatherId: player.data.id,
            cardId: result.id,
            rarity: parseInt(rarity!),
            print: print,
            moves: { connect: moves.map(m => ({id: m})) }
        } });

        const timeoutId = setTimeout(async () => {
            await client.db.cardInstance.deleteMany({ where: { id: card.id, status: "WILD" } })
        }, 1000 * 16);

        return {
            rarity: rarities[rarity as keyof typeof rarities],
            result: result,
            insert: card,
            timeout: timeoutId
        };

    });
}