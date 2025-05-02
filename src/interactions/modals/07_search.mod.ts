import { InteractionReplyOptions } from "discord.js";
import Interactable from "../../classes/Interactable.ts";

export default new Interactable({
    id: 7,
    async execute(interaction): Promise<InteractionReplyOptions> {
        const { fields, client } = interaction;
        const [ page, owner, sorBy ] = interaction.args;
        const search = fields.getTextInputValue("name") || null;

        return await client.panels.get("collection")!.execute!(interaction, page, owner, sorBy, search);
    }
})