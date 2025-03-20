import { InteractionReplyOptions, ModalComponentData } from "discord.js";
import Interactable from "../../classes/Interactable.ts";

export default new Interactable({
    id: 3,
    dontReply: true,
    async execute(interaction): Promise<InteractionReplyOptions> {
        const { values, args } = interaction;
        const [ type ] = values;
        const [ side ] = args;

        let modal = {};

        if (type === "currencies") {
            modal = {
                id: "4",
                title: `{locale_modals_4_title}`,
                inputs: [{ 
                    label: "{locale_modals_4_inputs_0_label}", 
                    placeholder: "{locale_modals_4_inputs_0_placeholder}",
                    customId: "coins",
                    style: "Short",
                    required: false
                }, { 
                    label: "{locale_modals_4_inputs_1_label}", 
                    placeholder: "{locale_modals_4_inputs_1_placeholder}",
                    customId: "gems",
                    style: "Short",
                    required: false
                }]
            };
        } else if (type === "cards") {
            modal = {
                id: "4",
                title: `{locale_modals_4-1_title}`,
                inputs: [{ 
                    label: "{locale_modals_4-1_inputs_0_label}", 
                    placeholder: "{locale_modals_4-1_inputs_0_placeholder}",
                    customId: "id",
                    style: "Short"
                }]
            };
        } else {
            modal = {
                id: "4",
                title: `{locale_modals_4-2_title}`,
                inputs: [{ 
                    label: "{locale_modals_4-2_inputs_0_label}", 
                    placeholder: "{locale_modals_4-2_inputs_0_placeholder}",
                    customId: "id",
                    style: "Short"
                }, { 
                    label: "{locale_modals_4-2_inputs_1_label}", 
                    placeholder: "{locale_modals_4-2_inputs_1_placeholder}",
                    customId: "count",
                    style: "Short"
                }]
            };
        }

        await interaction.showModal(interaction.components.modal({...(modal as any), args: { type: type, side: side }}));

        return {}
    }
})