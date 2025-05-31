import { InteractionReplyOptions } from "discord.js";
import Interactable from "../../classes/Interactable.ts";

export default new Interactable({
    id: 2,
    async execute(interaction): Promise<InteractionReplyOptions> {
        const { client, args } = interaction;

        clearTimeout(parseInt(args[0]));
        
        const message = interaction.message;
        if (!message) return {};
        if (!message.flags || !message.flags.has("IsComponentsV2"))  return {};
        if (!message.components) return {};

        await client.panels.get("encountering")!.execute!(interaction);

        const editable = message.components.findIndex(c => c.id === 500);
        if (editable == -1) return {};

        message.components[editable] = interaction.componentsV2.construct([{
            type: "Container", component_id: 500, container_data: { color: "#ffffff" },  components: [
                { type: "TextDisplay", text_display_data: { content: "🏃\u2800{locale_main_catchEscape}" } },
            ]
        }])[0];

        //iterate throught the ball buttons
        for (let actionRow of (message as any).components[0].components) {
            if (actionRow.id < 400) continue;

            for (let button of actionRow.components) {
                if (!button.data) continue;
                button.data.disabled = true;
            }
        }

        //action buttons
        for (let button of (message as any).components[message.components.length-1].components) {
            button.data.disabled = true;
        }

        //for some reason, the media gallery needs to be converted to JSON and back to work properly
        (message as any).components[0].components.splice(4, 1);
        const component: any = message.components[0].toJSON();
        component.components.splice(4, 0, { type: 12, items: [ { media: { url: "attachment://card.jpg" } } ] });
        message.components[0] = component;

        return { components: message.components };
    }
})