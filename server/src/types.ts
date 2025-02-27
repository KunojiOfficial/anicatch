import { ButtonInteraction, ChatInputCommandInteraction, InteractionReplyOptions, Message, MessagePayload, ModalSubmitFields, ModalSubmitInteraction, SelectMenuInteraction } from "discord.js";
import Client from "./classes/Client";
import Player from "./classes/Player";
import Components from "./classes/Components";
import { Prisma } from "@prisma/client";

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
        editReply: (options: string | MessagePayload | InteractionReplyOptions) => Promise<void>
}

interface HistoryElement {
    userId: number;
    cardId: number;
    type: string;
    moveId?: number;
    efectivness?: 0.5 | 1 | 2;
}

const UserWithIncludes = Prisma.validator<Prisma.UserDefaultArgs>()({ include: { config: true, role: true } });
type UserRole = Prisma.UserGetPayload<typeof UserWithIncludes>;

const CardWithIncludes = Prisma.validator<Prisma.CardInstanceDefaultArgs>()({ include: { card: true, stat: true } });
type CardIncluded = Prisma.CardInstanceGetPayload<typeof CardWithIncludes>;

const TradeWithIncludes = Prisma.validator<Prisma.TradeDefaultArgs>()({ include: { users: true } });
type TradeIncluded = Prisma.TradeGetPayload<typeof TradeWithIncludes>;

const BattleWithIncludes = Prisma.validator<Prisma.BattleDefaultArgs>()({ include: { cards: { include: { moves: true, stat: true, card: true } }, users: true } });
const BattleWithIncludesStronger = Prisma.validator<Prisma.BattleDefaultArgs>()({ include: { cards: { include: { moves: true, stat: true, card: true } }, users: { include: { cards: { where: { team: { gt: 0 } }, include: { moves: true, stat: true, card: true } } } } }});
type BattleIncluded = Prisma.BattleGetPayload<typeof BattleWithIncludes> | Prisma.BattleGetPayload<typeof BattleWithIncludesStronger>; 

export { DiscordClient, DiscordMessage, DiscordInteraction, UserRole, HistoryElement, CardIncluded, TradeIncluded, BattleIncluded };