import { ButtonInteraction, ChatInputCommandInteraction, Message, SelectMenuInteraction } from "discord.js";
import Client from "./classes/Client";
import Player from "./classes/Player";
import Components from "./classes/Components";

type DiscordClient = Client;
type DiscordMessage = Message;

interface DiscordInteraction extends Omit<ChatInputCommandInteraction, 'client'>, Omit<ButtonInteraction, 'client'>, Omit<SelectMenuInteraction, 'client'> {
    type: any,
    inGuild: any,
    inRawGuild: any,
    inCachedGuild: any,
    component: any,
    componentType: any,
    client: Client,
    player: Player,
    components: Components,
    targetId: Number,
    owner: String,
    args: any
}

export { DiscordClient, DiscordMessage, DiscordInteraction };