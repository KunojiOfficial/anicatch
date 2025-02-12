import { InteractionReplyOptions } from "discord.js";
import Interactable from "../../classes/Interactable";

export default new Interactable({
    id: 2,
    async execute(interaction): Promise<InteractionReplyOptions> {
        const { client, args } = interaction;

        clearTimeout(parseInt(args[0]));
        
        if (interaction.message?.embeds?.length < 2) {
            await interaction.editReply({ 
                components: [],
                embeds: [ 
                    {
                        ...interaction.message.embeds[0].data,
                        description: interaction.message.embeds[0].data.description?.substring(0, interaction.message.embeds[0].description?.indexOf("-#", 3)), 
                        image: { url: "attachment://card.jpg" },
                    },
                    interaction.components.embed({
                        color: "#ffffff",
                        description: "🏃\u2800{locale_main_catchEscape}"
                    })
                ]
            });
        }

        await client.panels.get("encountering")!.execute!(interaction);
        
        return {};
    }
})