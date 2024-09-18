import { InteractionReplyOptions } from "discord.js";
import Interactable from "../classes/Interactable";

export default new Interactable({
    id: 1,
    async execute(interaction): Promise<InteractionReplyOptions> {
        const { values, client } = interaction;

        const panel = client.panels.get(values[0]);
        if (!panel) throw "unknown panel";

        return await panel.execute!(interaction);
    }
})