import { InteractionReplyOptions } from "discord.js";
import { DiscordInteraction } from "../types.ts";
import Panel from "../classes/Panel.ts";

import changelogData from "../data/changelog.json";

export default new Panel({
    name: "changelog",
    async execute(interaction: DiscordInteraction): Promise<InteractionReplyOptions> {

        return {
            flags: ["IsComponentsV2"],
            components: interaction.componentsV2.construct([{
                type: "Container", components: [
                    { type: "TextDisplay", text_display_data: { content: `-# ${interaction.player.user}` } },
                    { type: "Separator" },
                    ...changelogData.content as any
                ]
            }])
        }
    }
}); 