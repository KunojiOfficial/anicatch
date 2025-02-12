import Bar from "./Bar"

interface StatsProps {
    data: {
        name: string,
        level: number,
        hp: number,
        maxHp: number
    }
}

export default function Stats({data}: StatsProps) {
    return (
        <>
            <div className="mx-5 px-3 py-5 rounded-2xl bg-gray-900 border-2 border-gray-700 shadow-2xl h-fit min-w-90 transition">
                <h4 className="font-bold text-2xl text-center">{data.name} <span className="text-base mx-1 text-gray-400">Lv. {data.level}</span></h4>
                <div className="my-2 p-2">
                    <Bar text="HP" val={data.hp} max={data.maxHp} color="green"/>
                </div>
            </div>
        </>
    )
}