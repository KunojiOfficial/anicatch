import { InteractionReplyOptions } from "discord.js";
import Interactable from "../../classes/Interactable.ts";

export default new Interactable({
    id: 0,
    async execute(interaction): Promise<InteractionReplyOptions> {
        const { args, client } = interaction;

        const panel = client.panels.get(args[0]);
        if (!panel) throw "unknown panel";

        return await panel.execute!(interaction, ...args.slice(1));
    }
})