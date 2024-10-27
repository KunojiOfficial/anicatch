import { InteractionReplyOptions } from "discord.js";
import Interactable from "../../classes/Interactable";

export default new Interactable({
    id: 3,
    dontReply: true,
    async execute(interaction): Promise<InteractionReplyOptions> {
        const { args, client } = interaction;

        const modal = args[0];
        const locale = client.locales.modals[interaction.locale][modal];
        if (!locale) throw "modal doesn't exist (or the locale doesn't support it)";
        
        let data:any = {};
        if (args.length > 1) {
            for (let i = 1; i < args.length; i++) {
                data[i] = args[i];
            } 
        }
        
        await interaction.showModal(interaction.components.modal({
            id: modal,
            title: locale.title,
            inputs: locale.inputs.map((input: any) => ({
                ...input,
                customId: "test",
                style: "Short"
            })),
            args: data
        }));
        
        return {}
    }
})