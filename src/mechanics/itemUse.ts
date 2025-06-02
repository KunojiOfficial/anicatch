import { Inventory, Item } from "@prisma/client";
import { DiscordInteraction } from "../types.ts";

export default async function(interaction: DiscordInteraction, item: Inventory, itemData: Item, count: number) {
    const { client } = interaction;

    if (!itemData.usable) throw "cant use";

    await client.db.$transaction(async tx => {
        if (itemData.type !== "CONSUMABLE") await tx.inventory.updateMany({ where: { itemId: item.itemId, userId: item.userId }, data: { count: { decrement: count } } });

        switch (itemData.type) {
            case "ENCOUNTER":
                const amount = count*(itemData.properties as any).encounters;
                await tx.user.updateMany({ where: { id: item.userId }, data: { encounters: { increment: amount } } });
                interaction.player.data.encounters += amount;

                break;
            case "CONSUMABLE":

                await interaction.showModal(interaction.components.modal({
                    id: "3",
                    title: "{locale_main_useItem}",
                    inputs: [{
                        style: "Short",
                        label: "ID",
                        customId: "cardId"
                    }],
                    args: { itemId: item.itemId, count: count }
                }))

                break;
            
            case "MOVE_BOX":
                const moves = [];
                for (let i = 0; i < count; i++) {
                    const rarity = (itemData.properties as any).rarity;
    
                    const rowCount = await tx.move.count({ where: { rarity: rarity } });
                    const randomOffset = Math.floor(Math.random() * rowCount);
            
                    const [result] = await tx.move.findMany({ where: {rarity: rarity}, skip: randomOffset, take: 1 });
                    if (!result) throw "no moves found";
    
                    moves.push(result);
                    await tx.moveInventory.upsert({
                        where: { moveId_userId: { userId: item.userId, moveId: result.id } },
                        create: { userId: item.userId, moveId: result.id, count: 1 },
                        update: { count: { increment: 1 } }
                    });
    
                }

                await interaction.followUp({
                    embeds: [ interaction.components.embed({
                        description: `{locale_main_movesObtained}:\n${moves.map(m => `* \`${m.name}\``).join("\n")}`
                    }) ]
                })

                break;

            case "CHARM":
                const charmData = itemData.properties as { type: string, count: number, chance: number, tier: number };
                
                await tx.user.updateMany({ where: { id: item.userId }, data: { charm: charmData } });

            break;
        }

        await tx.log.create({ data: { userId: item.userId, action: "use", description: `uses ${item.itemId} x ${count}` } })
    });

    return interaction.player;
}