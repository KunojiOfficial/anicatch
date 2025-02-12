import { InteractionReplyOptions } from "discord.js";
import Interactable from "../../classes/Interactable";
import Trade from "../../classes/Trade";

export default new Interactable({
    id: 15,
    async execute(interaction): Promise<InteractionReplyOptions> {
        const { client, player } = interaction;

        const offer = await client.db.trade.findFirst({ where: { offererId: player.data.id, status: "CREATING" }, include: { users: true } });
        if (!offer) throw 42;
        if (!offer.offered.length) throw 52;

        const trade = new Trade(interaction, offer, offer.users);
        await trade.send();

        return { embeds: [ interaction.components.embed({
            description: "{emoji_yes}\u2800{locale_main_tradeSent}",
            color: "#00ff00"
        }) ], components: [] }
    }
});