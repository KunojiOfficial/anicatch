import { InteractionReplyOptions } from "discord.js";
import Interactable from "../../classes/Interactable.ts";
import { heal } from "../../mechanics/heal.ts";

export default new Interactable({
    id: 25,
    async execute(interaction): Promise<InteractionReplyOptions> {
        const { client, player } = interaction;

        const healedCards = await heal(client.db, player.data);

        return {
            embeds: [ interaction.components.embed({
                description: "{emoji_yes}\u2800{locale_main_healSuccess}",
            }, {
                count: [healedCards]
            }) ],
            components: []
        }
    }
})