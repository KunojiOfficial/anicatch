import { CardInstance, Move, MoveType } from "@prisma/client";

interface Participant {
    userId: number,
    teamId: number,
    type: "Player" | "Bot",
    cards: number[]
}

interface Animon {
    id: number,
    userId: number,
    action: ActionData,
    data: {
        instance: CardInstance
        moves: Move[]
    } | null
}

interface ActionData {
    type: "Move" | "Item" | "Switch" | "Forfeit" | "Spare"
    data: MoveData | SwitchData | null
    successful?: boolean
}

interface MoveData {
    id: number,
    type: MoveType,
    target: number
}

interface SwitchData {
    switchTo: number
}

interface History {
    turn: number,
    animons: Animon[],
    stats: {
        animonId: number,
        health: number,
        status: string
    }[]
}

export { Participant, Animon, ActionData, MoveData, History };