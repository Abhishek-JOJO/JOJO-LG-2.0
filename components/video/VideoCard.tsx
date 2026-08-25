interface VideoCardProps {
  id: string;
  title: string;
  thumbnail: string;
  duration?: string;
  genre?: string;
}

export function VideoCard({ id, title, thumbnail, duration, genre }: VideoCardProps) {
  return (
    <a
      href={`/watch/${id}`}
      className="group relative block aspect-video overflow-hidden rounded-lg bg-theme_10 transition-transform duration-200 hover:scale-105 hover:shadow-xl"
    >
      <img
        src={thumbnail}
        alt={title}
        className="h-full w-full object-cover transition-opacity duration-200 group-hover:opacity-80"
      />
      <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/90 via-black/20 to-transparent p-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
        <p className="text-[length:var(--text-sm)] font-semibold text-[var(--theme_2)] line-clamp-1">{title}</p>
        <div className="mt-1 flex items-center gap-2 text-[length:var(--text-xs)] text-theme_5">
          {genre && <span>{genre}</span>}
          {duration && <span>{`• ${duration}`}</span>}
        </div>
      </div>
    </a>
  );
}
