import Button from "../components/ui/Button";
import Card from "../components/battle/Card";
import Stats from "../components/battle/Stats";
import Modal from "../components/ui/Modal";
import Loader from "../components/ui/Loader";
import { useBattleStore } from "../store/battleStore";
import { useEffect, useState } from "react";

export default function Battle() {
    const { battle, targetMove, connect, error } = useBattleStore();
    const initialButtonTexts = ["Fight", "Bag", "Team", "Run"];
    const [buttonTexts] = useState(initialButtonTexts);
    const [modalContent, setModalContent] = useState<React.ReactNode>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [cachedTurn, setCachedTurn] = useState(0);
    const [cachedMove, setCachedMove] = useState(0);

    useEffect(() => {
        const discordId = localStorage.getItem("discordId");
        if (discordId) connect(discordId);
    }, [connect]);

    if (error) return <div className="error">{error}</div>;
    if (!battle) return <Loader />;

    const processHistory = (history: any) => {
        let text = "";

        const card = battle.cards.find((card: any) => card.id === history.cardId);
        const cardName = card.card.character.name;
        const moveName = card.moves.find((move: any) => move.id === history.moveId).name;

        text = `${cardName} used ${moveName}!`;

        if (history.efectivness === 0.5) text += " It was not very effective...";
        else if (history.efectivness === 2) text += " It was super effective!";

        return text;
    }

    const handleFightClick = () => {
        const moves: Move = battle.cards.find((card:any) => card.id === battle.cardId1).moves;

        setModalContent(
            <div className="grid grid-cols-1 gap-3">
                {moves.map((move: any, index: number) => (
                    <Button disabled={move.pp-battle.history.filter((h: any) => h.type === "move" && h.cardId === battle.cardId1 && h.moveId === move.id).length<=0} key={index} icon={"src/assets/types/" + move.type + ".png"} pp={move.pp-battle.history.filter((h: any) => h.type === "move" && h.cardId === battle.cardId1 && h.moveId === move.id).length + "/" + move.pp} onClick={() => handleMoveClick(move.id)}>
                        {move.name}
                    </Button>
                ))}
            </div>
        );
        
        setIsModalOpen(true);
    };

    const handleBagClick = () => {

    };

    const handleTeamClick = () => {

    };

    const handleRunClick = async () => {

    };

    const handleMoveClick = async (move: string) => {
        const accessToken = localStorage.getItem('accessToken');
        if (!accessToken) {
            console.error('Access token is missing');
            return;
        }

        try {
            const response = await fetch('/.proxy/api/battle/move', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`, // Use the stored access token
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ move }),
            });

            if (!response.ok) throw new Error('Network response was not ok');
            
            const data = await response.json();
            console.log('Move response:', JSON.stringify(data));
            connect(); // Restart polling after move
        } catch (error) {
            console.error('Error posting move:', error);
        }
        
        setIsModalOpen(false);
    };

    const nextDialogue = () => {
        if (battle.turn === cachedTurn) return;

        if (cachedMove === 0) setCachedMove(1);
        else {
            setCachedMove(0);
            setCachedTurn(battle.turn);
        }
    };

    return (
        <>
            <div className="flex p-10">
                <div className="flex">
                    {(() => {
                        const card1 = battle.cards.find((card: any) => card.id === battle.cardId1);
                        const index1 = battle.cards.indexOf(card1);
                        return (
                            <>
                                <Card url={battle.urls?.length ? battle.urls[index1] : ""} />
                                <Stats data={{
                                    name: card1.card.character.name,
                                    type: card1.card.type,
                                    level: card1.level,
                                    hp: card1.stat.hp === -1 ? card1.maxHp : card1.stat.hp,
                                    maxHp: card1.maxHp
                                }} />
                            </>
                        );
                    })()}
                </div>
                <div className="flex">
                    {(() => {
                        const card2 = battle.cards.find((card: any) => card.id === battle.cardId2);
                        const index2 = battle.cards.indexOf(card2);
                        return (
                            <>
                                <Stats data={{
                                    name: card2.card.character.name,
                                    type: card2.card.type,
                                    level: card2.level,
                                    hp: card2.stat.hp === -1 ? card2.maxHp : card2.stat.hp,
                                    maxHp: card2.maxHp
                                }} />
                                <Card url={battle.urls?.length ? battle.urls[index2] : ""} />
                            </>
                        );
                    })()}
                </div>
            </div>
            <div className="fixed bottom-0" onClick={nextDialogue}>
                <div className="flex w-screen min-h-50 bg-gray-900 border-t-2 border-gray-700">
                    <div className="w-2/5 p-5">
                        <h2 className="text-2xl">
                            {battle.turn === cachedTurn ? 
                                (targetMove ? "Waiting for opponent..." : <>What will <span className="font-bold">{battle.cards.find((card: any) => card.id === battle.cardId1).card.character.name}</span> do?</>) :
                                <>
                                    {cachedMove === 0 ? processHistory(battle.history[battle.history.length-1]) : processHistory(battle.history[battle.history.length-2])}
                                    <div className="text-1x1 mt-2 italic">Click to continue...</div>
                                </>
                            }
                        </h2>
                    </div>
                    <div className="w-3/5 p-5 grid grid-rows-2 grid-cols-2 gap-1.5">
                    {!targetMove && cachedTurn === battle.turn ? <>
                        <Button onClick={handleFightClick}>
                            {buttonTexts[0]}
                        </Button>
                        <Button onClick={handleBagClick}>
                            {buttonTexts[1]}
                        </Button>
                        <Button onClick={handleTeamClick}>
                            {buttonTexts[2]}
                        </Button>
                        <Button onClick={handleRunClick}>
                            {buttonTexts[3]}
                        </Button>
                    </> : <></>}
                    </div>
                </div>
            </div>
            {isModalOpen && (
                <Modal onClose={() => setIsModalOpen(false)}>
                    {modalContent}
                </Modal>
            )}
        </>
    );
}