import { InteractionReplyOptions } from "discord.js";
import Interactable from "../../classes/Interactable.ts";

export default new Interactable({
    id: 6,
    async execute(interaction): Promise<InteractionReplyOptions> {
        const { fields, client } = interaction;
    
        const name = fields.getTextInputValue("name") || null;
        const series = fields.getTextInputValue("series") || null;

        return await client.panels.get("search")!.execute!(interaction, name, series);
    }
})