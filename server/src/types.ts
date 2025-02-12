import { ButtonInteraction, ChatInputCommandInteraction, Message, ModalSubmitFields, ModalSubmitInteraction, SelectMenuInteraction } from "discord.js";
import Client from "./classes/Client";
import Player from "./classes/Player";
import Components from "./classes/Components";
import { Prisma } from "@prisma/client";

type DiscordClient = Client;
type DiscordMessage = Message;

interface DiscordInteraction extends 
    Omit<ChatInputCommandInteraction, 'client'>, 
    Omit<ButtonInteraction, 'client'>, 
    Omit<SelectMenuInteraction, 'client'> {
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
        fields: ModalSubmitFields,
        showModal: any
}

const UserWithIncludes = Prisma.validator<Prisma.UserDefaultArgs>()({ include: { config: true, role: true } });
type UserRole = Prisma.UserGetPayload<typeof UserWithIncludes>;

const CardWithIncludes = Prisma.validator<Prisma.CardInstanceDefaultArgs>()({ include: { card: true, stat: true } });
type CardIncluded = Prisma.CardInstanceGetPayload<typeof CardWithIncludes>;

const TradeWithIncludes = Prisma.validator<Prisma.TradeDefaultArgs>()({ include: { users: true } });
type TradeIncluded = Prisma.TradeGetPayload<typeof TradeWithIncludes>;

export { DiscordClient, DiscordMessage, DiscordInteraction, UserRole, CardIncluded, TradeIncluded };