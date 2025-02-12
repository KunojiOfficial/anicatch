const colors = {
    red: "from-red-500 to-orange-500",
    green: "from-green-500 to-lime-500",
    blue: "from-blue-500 to-cyan-500",
};


interface BarProps {
    text: string,
    val: number;
    max: number;
    color: keyof typeof colors
}

export default function Bar({text, val, max, color} : BarProps) {
    const percentage = Math.floor((val/max)*100);

    return (
        <div className="min-w-auto bg-gray-800 rounded-lg overflow-hidden relative">
            <div
                className={`h-6 bg-gradient-to-r ${colors[color]} transition-all duration-500`}
                style={{ width: `${percentage}%` }}
            ></div>
            <span className="absolute inset-0 flex items-center justify-center text-white text-sm drop-shadow-md font-bold [text-shadow:_2px_2px_4px_rgba(0,0,0,0.7)]">
                <span className="mr-2">{text}:</span> {val} / {max}
            </span>
        </div>

    )
}