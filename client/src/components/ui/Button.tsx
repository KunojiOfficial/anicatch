export default function Button({ children, onClick, icon, pp, disabled }: { children: React.ReactNode; onClick?: () => void; icon?: string; pp?: string; disabled?: boolean }) {
    return (
        <button
            onClick={onClick}
            className={`text-2xl px-4 py-2 bg-gray-700 text-white font-semibold rounded-lg shadow-md transition flex items-center justify-between ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-500 focus:outline-none focus:bg-gray-800 cursor-pointer'}`}
            disabled={disabled}
        >
            {icon && <img src={icon} alt="icon" className="inline-block mr-4 h-7" />}
            <span className={"flex-1 " + (!icon && "text-center")}>{children}</span>
            {pp && <span className="ml-4">[{pp}]</span>}
        </button>
    );
}
