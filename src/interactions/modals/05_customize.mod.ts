import { InteractionReplyOptions } from "discord.js";
import Interactable from "../../classes/Interactable.ts";
import Trade from "../../classes/Trade.ts";

function isValidHexColor(hex: string): boolean {
    return /^#[0-9A-F]{6}$/i.test(hex);
}

export default new Interactable({
    id: 5,
    async execute(interaction): Promise<InteractionReplyOptions> {
        const { fields, client, player } = interaction;
    
        const color = fields.getTextInputValue("color") || null;
        const desc = fields.getTextInputValue("desc") || null;

        if (color && !isValidHexColor(color)) throw 75;

        await client.db.userProfile.upsert({
            where: { userId: player.data.id },
            update: { color, description: desc },
            create: { userId: player.data.id, color, description: desc }
        });

        const profile = await client.panels.get("profile")!.execute!(interaction, interaction.user);
        return profile;
    }
})