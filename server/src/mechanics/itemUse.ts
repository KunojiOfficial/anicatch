import { Inventory, Item } from "@prisma/client";
import { DiscordInteraction } from "../types";

export default async function(interaction: DiscordInteraction, item: Inventory, itemData: Item, count: number) {
    const { client } = interaction;

    if (!itemData.usable) throw "cant use";

    await client.db.$transaction(async tx => {
        if (itemData.type !== "CONSUMABLE") await tx.inventory.updateMany({ where: { itemId: item.itemId, userId: item.userId }, data: { count: { decrement: count } } });

        switch (itemData.type) {
            case "ENCOUNTER":
                const amount = count*(itemData.properties as any).encounters;
                await tx.user.updateMany({ where: { id: item.userId }, data: { encounters: { increment: amount } } });
                interaction.player.data.encounters += amount
                break;
            case "CONSUMABLE":

                await interaction.showModal(interaction.components.modal({
                    id: "3",
                    title: "test",
                    inputs: [{
                        style: "Short",
                        label: "ID",
                        customId: "cardId"
                    }],
                    args: { itemId: item.itemId, count: count }
                }))

                break;
        }

        await tx.log.create({ data: { userId: item.userId, action: "use", description: `uses ${item.itemId} x ${count}` } })
    });

    return interaction.player;
}