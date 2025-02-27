export default function Move({ children, onClick, icon, pp, disabled, acc, pow, type }: { children: React.ReactNode; onClick?: () => void; icon?: string; pp?: string; acc?: string, pow?: string, type?: string, disabled?: boolean }) {
    return (
        <button
            onClick={onClick}
            className={`text-2xl px-4 py-2 bg-gray-700 text-white font-semibold rounded-lg shadow-md transition flex items-center justify-between ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-500 focus:outline-none focus:bg-gray-800 cursor-pointer'}`}
            disabled={disabled}
        >
            {icon && <img src={icon} alt="icon" className="inline-block mr-4 h-7" />}
            <div className={"flex-1 " + (!icon && "text-right")}>
                {children}
                <div className="text-sm mt-2">
                    {pp && <span>[{pp}]</span>}
                    {acc && <span className="ml-2">{type}</span>}
                    {pow && <span className="ml-2">POWER: {pow}</span>}
                    {acc && <span className="ml-2">ACCURACY: {acc}%</span>}
                </div>
            </div>
        </button>
    );
}
