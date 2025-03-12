import { ButtonInteraction, ChatInputCommandInteraction, InteractionReplyOptions, Message, MessagePayload, ModalSubmitFields, ModalSubmitInteraction, SelectMenuInteraction } from "discord.js";
import Client from "./classes/Client";
import Player from "./classes/Player";
import Components from "./classes/Components";
import { Prisma } from "@prisma/client";

import emoji from 'src/config/emoji.json';

type DiscordClient = Client;
type DiscordMessage = Message;

interface DiscordInteraction extends 
    Omit<ChatInputCommandInteraction, 'client' | 'editReply'>, 
    Omit<ButtonInteraction, 'client' | 'editReply'>, 
    Omit<SelectMenuInteraction, 'client' | 'editReply'> {
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
        showModal: any,
        tutorial: boolean,
        editReply: (options: string | MessagePayload | InteractionReplyOptions) => Promise<void>
}

interface Button {
    id?: String
    owner?: String
    cooldown?: { id: string, time: number }
    label?: string
    emoji?: keyof typeof emoji | string
    hardEmoji?: string,
    args?: Object
    url?: string
    disabled?: Boolean,
    skuId?: string,
    style?: "blurple" | "gray" | "green" | "red" | "link" | "premium"
}

interface HistoryElement {
    userId: number;
    cardId: number;
    type: string;
    moveId?: number;
    efectivness?: 0.5 | 1 | 2;
    itemId?: number;
    itemData?: any;
    kill?: number;
    damage?: number;
    defended?: number;
    moveType?: string;
    miss?: boolean;
}

const UserWithIncludes = Prisma.validator<Prisma.UserDefaultArgs>()({ include: { config: true, role: true } });
type UserRole = Prisma.UserGetPayload<typeof UserWithIncludes>;

const CardWithIncludes = Prisma.validator<Prisma.CardInstanceDefaultArgs>()({ include: { card: true } });
type CardIncluded = Prisma.CardInstanceGetPayload<typeof CardWithIncludes>;

const TradeWithIncludes = Prisma.validator<Prisma.TradeDefaultArgs>()({ include: { users: true } });
type TradeIncluded = Prisma.TradeGetPayload<typeof TradeWithIncludes>;

export { DiscordClient, DiscordMessage, DiscordInteraction, UserRole, HistoryElement, CardIncluded, TradeIncluded, Button };