import { InteractionReplyOptions } from "discord.js";
import Interactable from "../../classes/Interactable.ts";

export default new Interactable({
    id: 23,
    dontReply: true,
    async execute(interaction): Promise<InteractionReplyOptions> {
        const { player, client } = interaction;

        if (player.role?.canCustomize !== true) throw 74;

        const data = await client.db.userProfile.findFirst({ where: { userId: player.data.id } });
        
        await interaction.showModal(interaction.components.modal({
            id: '5',
            title: `{locale_modals_5_title}`,
            inputs: [{ 
                label: "{locale_modals_5_inputs_0_label}", 
                placeholder: "{locale_modals_5_inputs_0_placeholder}",
                customId: "color",
                style: "Short",
                minLength: 7,
                maxLength: 7,
                required: false,
                value: data?.color || undefined
            }, {
                label: "{locale_modals_5_inputs_1_label}", 
                placeholder: "{locale_modals_5_inputs_1_placeholder}",
                customId: "desc",
                style: "Paragraph",
                maxLength: 500,
                required: false,
                value: data?.description || undefined
            }],
        }));
        
        return {}
    }
})