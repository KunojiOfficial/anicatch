import { InteractionReplyOptions } from "discord.js";
import Interactable from "../../classes/Interactable.ts";

export default new Interactable({
    id: 24,
    dontReply: true,
    async execute(interaction): Promise<InteractionReplyOptions> {
        await interaction.showModal(interaction.components.modal({
            id: '6',
            title: `{locale_modals_6_title}`,
            inputs: [{ 
                label: "{locale_modals_6_inputs_0_label}", 
                placeholder: "{locale_modals_6_inputs_0_placeholder}",
                customId: "name",
                style: "Short",
                required: false
            }, {
                label: "{locale_modals_6_inputs_1_label}", 
                placeholder: "{locale_modals_6_inputs_1_placeholder}",
                customId: "series",
                required: false,
                style: "Short"
            }],
        }));
        
        return {}
    }
})