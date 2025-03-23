import { InteractionReplyOptions } from "discord.js";
import Interactable from "../../classes/Interactable.ts";
import Battle from "../../classes/Battle.ts";

export default new Interactable({
    id: 5,
    async execute(interaction): Promise<InteractionReplyOptions> {
        const { args, player, client } = interaction;
        let [ action, battleId, messageId ] = args;

        battleId = parseInt(battleId);
        if (isNaN(battleId)) throw "nan";

        const battle = await interaction.client.db.battle.findFirst({ where: { id: battleId, OR: [{ userId1: player.data.id }, { userId2: player.data.id }], status: "ACTIVE" } });
        if (!battle) throw 27;

        const battleInstance = new Battle(battle, player.data.id);

        if (action === "move") {
            const moveId = parseInt(interaction.values[0]);
            await battleInstance.selectAction("move", { moveId, userId: player.data.id });
        } else if (action === "team") {
            const cardId = parseInt(interaction.values[0]);
            await battleInstance.selectAction("switch", { cardId });
        }

        const message = await interaction.channel.messages.fetch(messageId);
        if (message) await message.edit(await client.panels.get("battle")!.execute(interaction) as any);

        return {
            components: [],
            content: "✅"
        };
    }
})