import Bar from "./Bar"

interface StatsProps {
    data: {
        name: string,
        type: "INFERNO" | "FROST" | "NATURE" | "LIGHT" | "VOID",
        level: number,
        hp: number,
        maxHp: number
    }
}

export default function Stats({data}: StatsProps) {
    return (
        <>
            <div className="mx-5 px-3 py-5 rounded-2xl bg-gray-900 border-2 border-gray-700 shadow-2xl h-fit min-w-90 transition">
                <div className="flex items-center justify-center">
                    <img className="h-8 mr-2" src={`src/assets/types/${data.type.toLowerCase()}.png`} alt={data.type}/>
                    <h4 className="font-bold text-2xl text-center">{data.name} <span className="text-base mx-1 text-gray-400">Lv. {data.level}</span></h4>
                </div>
                <div className="my-2 p-2">
                    <Bar text="HP" val={data.hp} max={data.maxHp} color="green"/>
                </div>
            </div>
        </>
    )
}