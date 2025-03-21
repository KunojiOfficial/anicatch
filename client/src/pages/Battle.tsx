/* eslint-disable @typescript-eslint/no-explicit-any */

import Button from "../components/ui/Button";
import Card from "../components/battle/Card";
import Stats from "../components/battle/Stats";
import Modal from "../components/ui/Modal";
import Loader from "../components/ui/Loader";
import { useBattleStore } from "../store/battleStore";
import { useEffect, useState } from "react";
import useWindowDimensions from "../hooks/useWindowDimensions"; // Import custom hook
import './Battle.css'; // Import the CSS file for background animation
import Move from "../components/battle/Move";

export default function Battle() {
    const { battle, targetMove, connect, error, battleFinished } = useBattleStore();
    const initialButtonTexts = ["Fight", "Bag", "Team", "Run"];
    const [buttonTexts] = useState(initialButtonTexts);
    const [modalContent, setModalContent] = useState<React.ReactNode>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [cachedTurn, setCachedTurn] = useState(0);
    const [cachedMove, setCachedMove] = useState(0);

    const { width } = useWindowDimensions(); // Get screen width

    useEffect(() => {
        connect();
    }, [connect]);

    if (error) return <div className="error">{error}</div>;
    if (!battle) return <Loader />;

    const processHistory = (history: any) => {
        let text = "";

        let index = 0;
        if (battle.user1.cards.find((card: any) => card.id === history.cardId)) index = 1;
        else index = 2;

        const card = battle.user1.cards.find((card: any) => card.id === history.cardId) || battle.user2.cards.find((card: any) => card.id === history.cardId);
        const user = index === 1 ? battle.user1 : battle.user2;
        
        const cardName = card.card.character.name;
        
        if (history.type === "move") {
            const moveName = card.moves.find((move: any) => move.id === history.moveId).name;
    
            text = `${cardName} used ${moveName}!`;
            
            if (history.miss) text += " But it missed!";
            else {
                if (history.moveType === "ATTACK") {
                    if (history.efectivness === 0.5) text += " It was not very effective...";
                    else if (history.efectivness === 2) text += " It was super effective!";
                }
    
                if (history.defended > 0) text += `\nThe enemy blocked ${history.defended} damage!`;
                if (history.damage > 0) text += `\n${cardName} dealt ${history.damage} damage!`;
    
                if (history.kill > 0) {
                    const enemy = user.id === battle.user1.id ? battle.user2 : battle.user1;
                    const killedCard = enemy.cards.find((card: any) => card.id === history.kill);
    
                    text += ` ${killedCard.card.character.name} fainted!`;
                }
            }
        } else if (history.type === "switch") {
            text = `${cardName} joins the battle!`;
        } else if (history.type === "item") {
            text = `${user.username} used ${history.itemData.name} on ${cardName}!`;
        } else if (history.type === "fail") {
            text = `${user.username}'s action failed...`;
        } else {
            text = `${cardName} did nothing...`;
        }

        return text;
    }

    const handleFightClick = () => {
        const card = battle.user1.cards.find((card: any) => card.id === battle.battle.cardId1 || card.id === battle.battle.cardId2);
        const moves = card.moves;

        setModalContent(
            <div className="grid grid-cols-1 gap-3">
                {moves.map((move: any, index: number) => (
                    <Move 
                        key={index} 
                        icon={"src/assets/types/" + move.type + ".png"} 
                        type={move.moveType}
                        acc={move.accuracy}
                        pow={move.power}
                        pp={move.pp-battle.battle.history.filter((h: any) => h.type === "move" && h.cardId === card.id && h.moveId === move.id).length + "/" + move.pp} 
                        onClick={() => handleMoveClick(move.id)}
                    >
                        {move.name}
                    </Move>
                ))}
            </div>
        );
        
        setIsModalOpen(true);
    };

    const handleBagClick = () => {
        const items = battle.items;

        setModalContent(
            <div className="grid grid-cols-1 gap-3">
                {items.map((item: any, index: number) => (
                    <Button key={index} icon={`src/assets/items/${item.img}.png`} onClick={() => handleItemClick(item.id)}>
                        {item.name}
                    </Button>
                ))}
            </div>
        );

        setIsModalOpen(true);
    };

    const handleItemClick = (itemId: number) => {
        const cards = battle.user1.cards;

        setModalContent(
            <div className="grid grid-cols-1 gap-3">
                {cards.map((card: any, index: number) => (
                    <Button key={index} icon={"src/assets/types/" + card.card.type + ".png"} onClick={() => handleTeamItemClick(card.id, itemId)}>
                        {card.card.character.name}
                    </Button>
                ))}
            </div>
        );

        setIsModalOpen(true);
    }

    const handleTeamItemClick = async (cardId: number, itemId: number) => {
        if (itemId === 0) return;

        setCachedTurn(0);
        setIsModalOpen(false);

        const accessToken = localStorage.getItem('accessToken');
        if (!accessToken) {
            console.error('Access token is missing');
            return;
        }

        try {
            const response = await fetch('/.proxy/api/battle/item', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`, // Use the stored access token
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ itemId, cardId }),
            });

            if (!response.ok) throw new Error('Network response was not ok');
            
            connect();
        } catch (error) {
            console.error('Error posting move:', error);
        }
        
    };  

    const handleTeamClick = () => {
        const cards = battle.user1.cards;
        const activeCard = battle.user1.cards.find((card: any) => card.id === battle.battle.cardId1 || card.id === battle.battle.cardId2);

        setModalContent(
            <div className="grid grid-cols-1 gap-3">
                {cards.map((card: any, index: number) => (
                    <Button key={index} icon={"src/assets/types/" + card.card.type + ".png"} onClick={() => handleSwitchClick(card.id)} disabled={card.status === "DEAD" || card.id === activeCard.id}>
                        {card.card.character.name}
                    </Button>
                ))}
            </div>
        );

        setIsModalOpen(true);
    };

    const handleRunClick = async () => {
        const accessToken = localStorage.getItem('accessToken');
        if (!accessToken) {
            console.error('Access token is missing');
            return;
        }

        try {
            const response = await fetch('/.proxy/api/battle/run', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`, // Use the stored access token
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ }),
            });

            if (!response.ok) throw new Error('Network response was not ok');

            connect(); // Restart polling after move
        } catch (error) {
            console.error('Error posting move:', error);
        }
        
        setIsModalOpen(false);
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
            
            connect(); // Restart polling after move
        } catch (error) {
            console.error('Error posting move:', error);
        }
        
        setIsModalOpen(false);
    };

    const handleSwitchClick = async (cardId: number) => {
        const accessToken = localStorage.getItem('accessToken');
        if (!accessToken) {
            console.error('Access token is missing');
            return;
        }

        try {
            const response = await fetch('/.proxy/api/battle/switch', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`, // Use the stored access token
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ cardId }),
            });

            if (!response.ok) throw new Error('Network response was not ok');

            connect(); // Restart polling after move
        } catch (error) {
            console.error('Error posting move:', error);
        }
        
        setIsModalOpen(false);
    };

    const nextDialogue = () => {
        if (battle.battle.turn === cachedTurn) return;

        if (cachedMove === 0) setCachedMove(1);
        else {
            setCachedMove(0);
            setCachedTurn(battle.battle.turn);
        }
    };

    return (
        <div className="battle-background">
            {battleFinished ? 
                <div className="flex justify-center items-center h-screen">
                    <div className=" bg-gray-900 border-2 border-gray-700 p-16 rounded-2xl shadow-2xl">
                        <h1 className="text-4xl">The battle has ended!</h1>
                        <h2 className="text-2xl mt-5">You can close this window and view the battle results in the Discord chat.</h2>
                    </div>
                </div> : 
                <>
                    <div className={`flex  ${width > 1120 ? "p-10  w-full justify-center" : "pt-5"}`}>
                        <div className="flex">
                            {(() => {
                                const card1 = battle.user1.cards.find((card: any) => card.id === battle.battle.cardId1 || card.id === battle.battle.cardId2);
                                return (
                                    <>
                                        {width > 1120 && <Card url={card1.url} />}
                                        <Stats data={{
                                            name: card1.card.character.name,
                                            type: card1.card.type,
                                            level: card1.level,
                                            hp: card1.hp === -1 ? card1.maxHp : card1.hp,
                                            maxHp: card1.maxHp,
                                            teamAlive: battle.user1.cards.filter((card: any) => card.status !== "DEAD").length
                                        }} />
                                    </>
                                );
                            })()}
                        </div>
                        <div className="flex">
                            {(() => {
                                const card2 = battle.user2.cards.find((card: any) => card.id === battle.battle.cardId1 || card.id === battle.battle.cardId2);
                                return (
                                    <>
                                        <Stats data={{
                                            name: card2.card.character.name,
                                            type: card2.card.type,
                                            level: card2.level,
                                            hp: card2.hp === -1 ? card2.maxHp : card2.hp,
                                            maxHp: card2.maxHp,
                                            teamAlive: battle.user2.cards.filter((card: any) => card.status !== "DEAD").length
                                        }} />
                                        {width > 1120 && <Card url={card2.url} />}
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                    <div className="fixed bottom-0" onClick={nextDialogue}>
                        <div className="flex w-screen min-h-50 bg-gray-900 border-t-2 border-gray-700 px-16">
                            <div className={battle.battle.turn === cachedTurn && !targetMove ? "w-2/5 p-5" : "w-full p-5"}>
                                <h2 className="text-2xl">
                                    {battle.battle.turn === cachedTurn ? 
                                        (targetMove ? "Waiting for opponent..." : <>What will <span className="font-bold">{battle.user1.cards.find((card: any) => card.id === battle.battle.cardId1 || card.id === battle.battle.cardId2).card.character.name}</span> do?</>) :
                                        <>
                                            {cachedMove === 0 ? processHistory(battle.battle.history[battle.battle.history.length-2]) : processHistory(battle.battle.history[battle.battle.history.length-1])}
                                            <div className="text-1x1 mt-2 italic">Click to continue...</div>
                                        </>
                                    }
                                </h2>
                            </div>
                            <div className="w-3/5 p-5 grid grid-rows-2 grid-cols-2 gap-1.5">
                            {!targetMove && cachedTurn === battle.battle.turn ? <>
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
            }
        </div>
    );
}