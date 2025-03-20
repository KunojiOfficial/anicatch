import { InteractionReplyOptions } from "discord.js";
import Interactable from "../../classes/Interactable.ts";

export default new Interactable({
    id: 0,
    async execute(interaction): Promise<InteractionReplyOptions> {
        const { values } = interaction;
        const [ index, value ] = values[0].split(':');

        interaction.args[parseInt(index)] = value;
        
        const [_, ...args] = interaction.args;

        return await interaction.client.panels.get(interaction.args[0])!.execute!(interaction, ...args);
    }
})