import { InteractionReplyOptions } from "discord.js";
import Interactable from "../../classes/Interactable";
import Trade from "../../classes/Trade";

export default new Interactable({
    id: 4,
    async execute(interaction): Promise<InteractionReplyOptions> {
        const { values, client, args, player } = interaction;
        const [ type, value ] = values[0].split(":");
        const [ side ] = args;

        if (!type || !value || !side) return {};

        const offer = await client.db.trade.findFirst({ where: { offererId: player.data.id, status: "CREATING" } });
        if (!offer) throw 42;

        const trade = new Trade(interaction, offer);
        await trade.remove(side, type as any, value as any);

        return await client.panels.get("tradeCreator")!.execute!(interaction,side);
    }
})