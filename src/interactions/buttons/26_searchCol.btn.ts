import { InteractionReplyOptions } from "discord.js";
import Interactable from "../../classes/Interactable.ts";

export default new Interactable({
    id: 26,
    dontReply: true,
    async execute(interaction): Promise<InteractionReplyOptions> {
        const [ path, page, owner, sorBy, search ] = interaction.args;
        await interaction.showModal(interaction.components.modal({
            id: '7',
            title: `{locale_modals_7_title}`,
            inputs: [{ 
                label: "{locale_modals_7_inputs_0_label}", 
                placeholder: "{locale_modals_7_inputs_0_placeholder}",
                customId: "name",
                style: "Short",
                value: search,
                required: false
            }],
            args: { page, owner, sorBy }
        }));
        
        return {}
    }
})