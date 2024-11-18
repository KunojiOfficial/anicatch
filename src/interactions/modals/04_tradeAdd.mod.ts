import { InteractionReplyOptions } from "discord.js";
import Interactable from "../../classes/Interactable";
import Trade from "../../classes/Trade";

export default new Interactable({
    id: 4,
    async execute(interaction): Promise<InteractionReplyOptions> {
        const { fields, args, client, player } = interaction;
        const [ type, side ] = args;

        const offer = await client.db.trade.findFirst({ where: { offererId: player.data.id, status: "CREATING" }, include: { users: true } });
        if (!offer) throw 42;

        const trade = new Trade(interaction, offer, offer.users);

        if (type === "currencies") {
            let coins = parseInt(fields.getTextInputValue("coins")), gems = parseInt(fields.getTextInputValue("gems"));

            if (!isNaN(coins) && coins > 0) await trade.add(side, { type: "currencies", count: coins, value: 1 });
            if (!isNaN(gems) && gems > 0) await trade.add(side, { type: "currencies", count: gems, value: 2 });
        } else if (type === "cards") {
            let field = fields.getTextInputValue("id").toUpperCase();
            let [ cardId, print ]: (string|number)[] = field.split("-"); //for human ID system as ABC-123       
            print = parseInt(print);

            if (!cardId || !print || isNaN(print)) throw 8;

            await trade.add(side, { type: "cards", count: 1, value: { cardId: client.getIdReverse(cardId), print: print } });
        } else if (type === "items") {
            let id = parseInt(fields.getTextInputValue("id")), count = parseInt(fields.getTextInputValue("count"));
            if (isNaN(id) || isNaN(count) || count < 1) throw 15;

            await trade.add(side, { type: "items", count: count, value: id });
        }

        return await client.panels.get("tradeCreator")!.execute!(interaction,side);
    }
})