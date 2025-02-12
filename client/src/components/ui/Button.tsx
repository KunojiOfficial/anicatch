export default function Button({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
    return (
        <button
            onClick={onClick}
            className="text-2xl px-4 py-2 bg-gray-700 text-white font-semibold rounded-lg shadow-md hover:bg-gray-500 focus:outline-none focus:bg-gray-800 transition cursor-pointer"
        >
            {children}
        </button>
    );
}
  