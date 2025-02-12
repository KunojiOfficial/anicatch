interface CardProps {
    url: string
}

export default function Card({ url }: CardProps) {
    return (
        <>
            <div className="">
                <img src={url} className="px-3 py-5 rounded-2xl bg-gray-900 border-2 border-gray-700 shadow-2xl hover:rotate-5 transition" />
            </div>
        </>
    )
}