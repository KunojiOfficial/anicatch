import { InteractionReplyOptions } from "discord.js";
import Interactable from "../../classes/Interactable";

export default new Interactable({
    id: 22,
    async execute(interaction): Promise<InteractionReplyOptions> {
        const { player, client } = interaction;

        const tutorial = await client.db.tutorial.findFirst({ where: { userId: player.data.id } });
        if (tutorial) throw 66;

        await client.db.$transaction(async tx => {
            await tx.tutorial.create({ data: { userId: player.data.id, step: 0 } });
            await tx.user.update({ where: { id: player.data.id }, data: { status: "TUTORIAL" } });
        })

        return {}
    }
});