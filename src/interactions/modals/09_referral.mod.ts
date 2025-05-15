import { InteractionReplyOptions } from "discord.js";
import Interactable from "../../classes/Interactable.ts";

export default new Interactable({
    id: 9,
    async execute(interaction): Promise<InteractionReplyOptions> {
        const { client, player } = interaction;

        const success = await player.setReferralCode(client.db, interaction.fields.getTextInputValue("test0"));

        await interaction.followUp({
            flags: ["IsComponentsV2"],
            components: interaction.componentsV2.construct([{
                type: "Container", container_data: { color: (success ? "#00ff00" : "#ff0000" ) }, components: [
                    { type: "TextDisplay", text_display_data: { content: success ? `{locale_main_referralCodeSet}` : `{locale_main_referralCodeError}` } }
                ]
            }])
        });
        
        return {}
    }
})