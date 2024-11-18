import { InteractionReplyOptions } from "discord.js";
import Interactable from "../../classes/Interactable";
import Trade from "../../classes/Trade";

export default new Interactable({
    id: 16,
    async execute(interaction): Promise<InteractionReplyOptions> {
        const { args, client, player } = interaction;
        let [ result, tradeId ] = args;
        tradeId = parseInt(tradeId);

        const offer = await client.db.trade.findFirst({ where: { id: tradeId, status: "ACTIVE", OR: [{recipientId: player.data.id}, {offererId: player.data.id}] }, include: { users: true } });
        if (!offer || (result === "accept" && offer.recipientId !== player.data.id)) throw 42;

        const trade = new Trade(interaction, offer, offer.users);

        let text;
        if (result === "accept") {
            text = "You have successfully accepted this trade offer!"
            await trade.accept();
        } else {
            text = "You have successfully rejected this trade offer!"
            await trade.reject();
        }

        return { embeds: [ interaction.components.embed({
            description: "{emoji_yes}\u2800" + text,
            color: "#00ff00"
        }) ], components: [] }
    }
});