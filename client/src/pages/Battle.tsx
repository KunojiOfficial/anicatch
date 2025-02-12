import Button from "../components/ui/Button";
import Card from "../components/battle/Card";
import Stats from "../components/battle/Stats";
import Modal from "../components/ui/Modal";
import Loader from "../components/ui/Loader";
import { useBattleStore } from "../store/battleStore";
import { useEffect, useState } from "react";

export default function Battle() {
    const { battle, connect } = useBattleStore();
    const initialButtonTexts = ["Fight", "Bag", "Team", "Run"];
    const [buttonTexts] = useState(initialButtonTexts);
    const [modalContent, setModalContent] = useState<React.ReactNode>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        const discordId = localStorage.getItem("discordId");
        if (discordId) connect(discordId);
    }, [connect]);

    if (!battle) return <Loader />;

    const handleFightClick = () => {
        const moves = battle.cards[0].moves.map((move: { name: string }) => move.name);
        setModalContent(
            <div className="grid grid-cols-2 gap-3">
                {moves.map((move: string, index: number) => (
                    <Button key={index} onClick={() => handleMoveClick(move)}>
                        {move}
                    </Button>
                ))}
            </div>
        );
        setIsModalOpen(true);
    };

    const handleBagClick = () => {
        const items = battle.users[0].inventory.map((item: any) => item.name);
        setModalContent(
            <div>
                {items.map((item, index) => (
                    <Button key={index}>
                        {item}
                    </Button>
                ))}
            </div>
        );
        setIsModalOpen(true);
    };

    const handleTeamClick = () => {
        const team = battle.users[0].team.map((card: any) => card.character.name);
        setModalContent(
            <div>
                {team.map((card, index) => (
                    <Button key={index}>
                        {card}
                    </Button>
                ))}
            </div>
        );
        setIsModalOpen(true);
    };

    const handleRunClick = async () => {
        try {
            const response = await fetch('/api/run', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ action: 'run' }),
            });
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();
            console.log('Run response:', data);
        } catch (error) {
            console.error('Error posting run action:', error);
        }
    };

    const handleMoveClick = async (move: string) => {
        try {
            const response = await fetch('/api/move', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ move }),
            });
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();
            console.log('Move response:', data);
        } catch (error) {
            console.error('Error posting move:', error);
        }
        setIsModalOpen(false);
    };

    return (
        <>
            <div className="flex p-10">
                <div className="flex">
                    <Card url={battle.urls?.length ? battle.urls[0] : ""} />
                    <Stats data={{
                        name: battle.cards[0].card.character.name,
                        level: battle.cards[0].level,
                        hp: battle.cards[0].stat.hp === -1 ? battle.cards[0].maxHp : battle.cards[0].stat.hp,
                        maxHp: battle.cards[0].maxHp
                    }} />
                </div>
                <div className="flex">
                    <Stats data={{
                        name: battle.cards[1].card.character.name,
                        level: battle.cards[1].level,
                        hp: battle.cards[1].stat.hp === -1 ? battle.cards[1].maxHp : battle.cards[1].stat.hp,
                        maxHp: battle.cards[1].maxHp
                    }} />
                    <Card url={battle.urls?.length ? battle.urls[1] : ""} />
                </div>
            </div>
            <div className="fixed bottom-0">
                <div className="flex w-screen min-h-50 bg-gray-900 border-t-2 border-gray-700">
                    <div className="w-2/5 p-5">
                        <h2 className="text-2xl">What will <span className="font-bold">{battle.cards[0].card.character.name}</span> do?</h2>
                    </div>
                    <div className="w-3/5 p-5 grid grid-rows-2 grid-cols-2 gap-1.5">
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