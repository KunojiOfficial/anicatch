import { InteractionReplyOptions } from "discord.js";
import Interactable from "../../classes/Interactable.ts";
import Card from "../../classes/Card.ts";

export default new Interactable({
    id: 28,
    dontReply: true,
    async execute(interaction): Promise<InteractionReplyOptions> {
        let [ id ] = interaction.args; 

        await interaction.showModal(interaction.components.modal({
            id: '8',
            title: `{locale_modals_8_title}`,
            inputs: [{ 
                label: "{locale_modals_8_inputs_0_label}", 
                placeholder: "{locale_modals_8_inputs_0_placeholder}",
                customId: "sacrifice",
                style: "Short",
                required: true
            }],
            args: { id }
        }));
        
        return {}

    }
})