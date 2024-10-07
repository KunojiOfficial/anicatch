import { InteractionReplyOptions } from "discord.js";
import Interactable from "../../classes/Interactable";

export default new Interactable({
    id: 0,
    async execute(interaction): Promise<InteractionReplyOptions> {
        const { fields, args, client } = interaction;
        let [ min, max, index, customId ] = args;
        let input = parseInt(fields.getTextInputValue("input"));
        
        const [ panel, ...values ] = customId.split(":");
        
        if (isNaN(input)) throw 15;
        if (input < parseInt(min) || input > parseInt(max)) throw 16;

        values[index-1] = input;

        return await client.panels.get(panel)!.execute!(interaction, ...values);
    }
})