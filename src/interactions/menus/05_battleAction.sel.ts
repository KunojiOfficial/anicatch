import { InteractionReplyOptions } from "discord.js";
import Interactable from "../../classes/Interactable.ts";
import Battle from "../../classes/Battle.ts";

export default new Interactable({
    id: 5,
    async execute(interaction): Promise<InteractionReplyOptions> {
        const { args, player, client } = interaction;
        let [ action, battleId, messageId, data ] = args;

        await interaction.editReply({
            components: [],
            content: client.formatText("{emoji_loader}\u2800", interaction.locale)
        })

        battleId = parseInt(battleId);
        if (isNaN(battleId)) throw "nan";

        const battle = await interaction.client.db.battle.findFirst({ where: { id: battleId, OR: [{ userId1: player.data.id }, { userId2: player.data.id }], status: "ACTIVE" } });
        if (!battle) throw 27;

        let newTurn = false;
        
        const battleInstance = new Battle(battle, player.data.id, client);
        
        if (action === "move") {
            const moveId = parseInt(interaction.values[0]);
            await battleInstance.selectAction("move", { moveId, userId: player.data.id });
        } else if (action === "team") {
            const cardId = parseInt(interaction.values[0]);
            await battleInstance.selectAction("switch", { cardId });
        } else if (action === "item") {
            const itemId = parseInt(data);
            const cardId = parseInt(interaction.values[0]);
            if (isNaN(itemId) || isNaN(cardId)) throw "nan";

            await battleInstance.selectAction("item", { itemId, cardId });
        }

        if ((battle.move1 && player.data.id === battle.userId2) || (battle.move2 && player.data.id === battle.userId1)) 
            newTurn = true;

        const message = await interaction.channel?.messages.fetch(messageId);
        const panel = await client.panels.get("battle")!.execute(interaction, battle.id);

        if (newTurn) {
            await interaction.followUp(panel);
            const components = message.components as any;
            if (components) {
                (message as any).components[0].components.splice(2, 1);
                const component: any = message.components[0].toJSON();
                component.components.splice(2, 0, { type: 12, items: [ { media: { url: "attachment://battle.jpg" } } ] });
                message.components[0] = component;

                components[0].components = components[0].components.filter(c => c.type !== 1);
            }

            if (message) await message.edit({ components: components });
        } else {
            if (message) await message.edit(panel as any);
        }

        return {
            components: [],
            content: "✅\u2800"
        };
    }
})