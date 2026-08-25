export function NavMenuListSkeleton() {
    return (
        <>
            <div className="flex items-center gap-2">
                <div className="h-10 w-40 rounded-full bg-theme_1/10 animate-pulse" />
            </div>
            <div className="w-12 h-4 bg-theme_1/10 rounded animate-pulse" />
            <div className="w-16 h-4 bg-theme_1/10 rounded animate-pulse" />
            <div className="w-12 h-4 bg-theme_1/10 rounded animate-pulse" />
            <div className="w-14 h-4 bg-theme_1/10 rounded animate-pulse" />
            <div className="w-10 h-4 bg-theme_1/10 rounded animate-pulse" />
        </>
    )
}