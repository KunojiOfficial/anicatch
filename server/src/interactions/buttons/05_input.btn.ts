import { InteractionReplyOptions } from "discord.js";
import Interactable from "../../classes/Interactable";

export default new Interactable({
    id: 5,
    dontReply: true,
    async execute(interaction): Promise<InteractionReplyOptions> {
        const { args } = interaction;
        const [ min, max, index, customId ] = args;
        
        await interaction.showModal(interaction.components.modal({
            id: '0',
            title: `{locale_modals_1_title}`,
            inputs: [{ 
                label: "{locale_modals_1_inputs_0_label}", 
                placeholder: "{locale_modals_1_inputs_0_placeholder}",
                customId: "input",
                style: "Short"
            }],
            args: { min: min, max: max, index: index, customId: customId }
        }, {
            min: [min],
            max: [max]
        }));
        
        return {}
    }
})