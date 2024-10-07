import { ButtonInteraction, ChatInputCommandInteraction, Message, ModalSubmitFields, ModalSubmitInteraction, SelectMenuInteraction } from "discord.js";
import Client from "./classes/Client";
import Player from "./classes/Player";
import Components from "./classes/Components";
import { Prisma } from "@prisma/client";

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
    args: any,
    fields: ModalSubmitFields
}

const UserWithIncludes = Prisma.validator<Prisma.UserDefaultArgs>()({ include: { config: true, role: true } });
type UserRole = Prisma.UserGetPayload<typeof UserWithIncludes>;

export { DiscordClient, DiscordMessage, DiscordInteraction, UserRole };