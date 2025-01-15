import { InteractionReplyOptions } from "discord.js";
import Interactable from "../../classes/Interactable";
import Trade from "../../classes/Trade";

export default new Interactable({
    id: 14,
    async execute(interaction): Promise<InteractionReplyOptions> {
        const { client, player } = interaction;

        const offer = await client.db.trade.findFirst({ where: { offererId: player.data.id, status: "CREATING" } });
        if (!offer) throw 42;

        const trade = new Trade(interaction, offer);
        await trade.cancel();

        return { embeds: [ interaction.components.embed({
            description: "{emoji_yes}\u2800{locale_main_tradeCancel}",
            color: "#00ff00"
        }) ], components: [] }
    }
});