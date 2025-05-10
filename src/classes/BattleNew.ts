import { CardInstance, Fight, Move, PrismaClient } from "@prisma/client";
import { ActionData, Animon, History, MoveData, Participant } from "../types/battleTypes";

const ActionPriorities = {
    Move: 1,
    Item: 2,
    Switch: 3,
    Forfeit: 4,
    Spare: 5
}

export default class Battle {
    public currentUser: number;
    public participants: Participant[] = [];
    public animons: Animon[] = [];

    public teamSize: number = 1;
    public timeLimit: number = 0;

    private prismaClient: PrismaClient;
    private data: Fight | null = null;

    constructor(prismaClient: PrismaClient, currentUser: number) {
        this.prismaClient = prismaClient;
        this.currentUser = currentUser;
    }

    /* ------------------------------------------- */
    /* ----------- Getters and Setters ----------- */
    /* ------------------------------------------- */

    public get isInitialized(): boolean {
        return this.data !== null;
    }

    public get areActionsSelected(): boolean {
        return this.animons.every(animon => animon.action !== null);
    }

    public get arePlayerActionsSelected(): boolean {
        return this.animons.filter(animon => this.participants.find(p => p.userId === animon.userId).type === "Player").every(animon => animon.action !== null);
    }

    public get isAnimonDataLoaded(): boolean {
        return this.animons.every(animon => animon.data !== null && animon.data !== undefined);
    }

    /* ------------------------------------------- */
    /* ------------- Public Methods -------------- */
    /* ------------------------------------------- */

    /**
     * Creates a new battle with the given participants, team size, and time limit.
     * @param participants participants - array of participants in the battle
     * @param teamSize teamSize - number of animons in each team
     * @param timeLimit timeLimit - time limit for the battle in seconds
     */
    public async create(participants: Participant[], teamSize: number = 1, timeLimit: number = 0) {
        if (this.isInitialized) throw new Error("Battle is already initialized");

        this.participants = participants;
        this.teamSize = teamSize;
        this.timeLimit = timeLimit;

        const users = await this.prismaClient.user.findMany({
            where: { id: { in: participants.filter(p => p.type === "Player").map(p => p.userId) } },
            include: { cards: { where: { team: { gt: 0 } }, orderBy: { team: "asc" } } }
        });

        for (const participant of participants) {
            const user = users.find(u => u.id === participant.userId);
            
            if (!user && participant.type === "Player") {
                throw new Error(`User with ID ${participant.userId} not found`);
            }

            let card: CardInstance;
            if (participant.type === "Player") card = user.cards[0];
            else card = await this.prismaClient.cardInstance.findFirst({ where: { id: participant.userId } });

            if (!card) throw new Error(`${participant.type} with ID ${participant.userId} has no cards`);

            if (user?.cards.length) participant.cards = user.cards.map(c => c.id);
            else participant.cards = [card.id];

            this.animons.push({ id: card.id, userId: participant.userId, action: null, data: null });
        }

        this.data = await this.prismaClient.fight.create({
            data: {
                teamSize,
                timeLimit,
                participants: this.participants as any,
                animons: this.animons as any,
            }
        });
    }

    /**
     * Initializes the battle with the given fight data.
     * @param data - The fight data to initialize the battle with.
     */
    public async initialize(data: Fight) {
        if (this.isInitialized) throw new Error("Battle is already initialized");

        this.data = data;
        this.participants = data.participants as any as Participant[];
        this.animons = data.animons as any as Animon[];
        this.teamSize = data.teamSize;
        this.timeLimit = data.timeLimit;
    }

    /**
     * Selects an action for the given animon in the battle.
     * @param cardId - The ID of the animon to select an action for.
     * @param action - The action data to select for the animon.
     */
    public async selectAction(cardId: number, action: ActionData) {
        if (!this.isInitialized) throw new Error("Battle is not initialized");

        const animon = this.animons.find(a => a.id === cardId);
        if (!animon) throw new Error(`Animon with ID ${cardId} not found`);

        if (animon.userId !== this.currentUser) throw new Error("You cannot select an action for this animon");

        animon.action = action;

        await this.prismaClient.fight.update({
            where: { id: this.data.id },
            data: { animons: this.animons as any }
        });

        await this.executeActions();
    }

    /**
     * Executes the actions of all animons in the battle.
     */
    private async executeActions() {
        if (!this.isInitialized) throw new Error("Battle is not initialized");
        if (!this.arePlayerActionsSelected) return;

        if (!this.areActionsSelected) await this.selectBotActions();

        // Load animon data if not already loaded
        if (!this.isAnimonDataLoaded) await this.loadAnimonData();

        // Sort actions by priority
        const sortedAnimonsByActions = this.animons.sort((a, b) => {
            if (!a || !b) return 0;
            return ActionPriorities[b.action.type] - ActionPriorities[a.action.type];
        });

        console.log("Executing actions in order of priority:", sortedAnimonsByActions);

        for (const animon of sortedAnimonsByActions) {
            if (!animon.action) continue; // Skip if no action is selected

            // Validate action
            animon.action.successful = await this.validateAction(animon);

            const type = animon.action.type;

            if (type === "Move") {
                console.log(`Executing move for animon ${animon.id}:`, animon.action.data);
            } else if (type === "Item") {
                console.log(`Executing item for animon ${animon.id}:`, animon.action.data);
            } else if (type === "Switch") {
                console.log(`Switching animon for animon ${animon.id}:`, animon.action.data);
            } else if (type === "Forfeit") {
                console.log(`Forfeiting battle for animon ${animon.id}`);
            } else if (type === "Spare") {
                console.log(`Spare action for animon ${animon.id}`);
            }
        }

        // Add to history
        const history: History = {
            turn: this.data.history.length + 1,
            animons: this.animons,
            stats: this.animons.map(animon => ({
                animonId: animon.id,
                health: animon.data.instance.hp,
                status: animon.data.instance.status
            }))
        };

        // Clear actions for next turn
        this.animons.forEach(animon => animon.action = null);

        // Update the battle in the database
        await this.prismaClient.fight.update({
            where: { id: this.data.id },
            data: {
                history: { push: history as any },
                animons: this.animons as any
            }
        });
    }

    /**
     * Selects actions for bot participants in the battle.
     * This method simulates the action selection process for bot participants.
     */
    private async selectBotActions() {
        if (!this.isInitialized) throw new Error("Battle is not initialized");

        const botParticipants = this.participants.filter(p => p.type === "Bot");
        for (const participant of botParticipants) {
            const animons = this.animons.filter(a => a.userId === participant.userId)
            for (const animon of animons) {
                console.log(`Bot ${participant.userId} is selecting action for animon ${animon.id}`);
                // Simulate bot action selection logic here
                animon.action = { type: "Move", data: { id: 1, target: 2, type: "ATTACK" } };
                
            }
        }
    }

    /** 
     * Loads the animon data for all animons in the battle.
     * This method fetches the card instance and moves for each animon.
    */
    private async loadAnimonData() {
        if (!this.isInitialized) throw new Error("Battle is not initialized");

        for (const animon of this.animons) {
            const cardInstance = await this.prismaClient.cardInstance.findUnique({ where: { id: animon.id }, include: { moves: true } });
            if (!cardInstance) throw new Error(`CardInstance with ID ${animon.id} not found`);

            animon.data = { instance: cardInstance, moves: cardInstance.moves };
        }
    }

    /**
     * Validates the action for a given animon.
     * @param animon The animon to validate the action for
     * @returns 
     */
    private async validateAction(animon: Animon): Promise<boolean> {
        if (!this.isAnimonDataLoaded) await this.loadAnimonData();

        const action = animon.action;
        
        if (action.type === "Move") {
            const data = action.data as MoveData;
            const move = animon.data.moves.find(m => m.id === data.id);

            if (!move) return false;
            if (this.calculateRemainingPP(animon, move, this.data.history as any as History[]) < 1) return false;
        }

        return true;
    }

    /**
     * Calculates the remaining PP for a given move of an animon based on the history of actions taken in the battle.
     * @param animon The animon to calculate remaining PP for
     * @param move The move to calculate remaining PP for
     * @param history The history of actions taken in the battle
     * @returns The remaining PP for the move
     */
    private calculateRemainingPP(animon: Animon, move: Move, history: History[]) : number {
        const animonHistory = history.filter(h => h.animons.find(a => a.id === animon.id));
        const moveCount = animonHistory.filter(h => h.animons.find(a => a.id === animon.id && a.action.type === "Move" && (a.action.data as MoveData).id === move.id)).length;

        return Math.max(0, move.pp - moveCount);
    }
}