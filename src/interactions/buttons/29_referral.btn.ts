import { InteractionReplyOptions } from "discord.js";
import Interactable from "../../classes/Interactable.ts";

export default new Interactable({
    id: 29,
    async execute(interaction): Promise<InteractionReplyOptions> {
        const { player, client } = interaction;

        const stats = await client.db.userStats.findFirst({ where: { userId: player.data.id } });
        if (!stats) throw 5;
        if (stats.captured < 5) throw "Not enough captures";

        await player.sendReferralRewards(client.db);
        interaction.player.data.refClaimed = true;
        const panel = await client.panels.get("referral").execute(interaction);
        return panel;
    }
})