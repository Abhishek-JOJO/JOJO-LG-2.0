interface LoaderProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: "h-4 w-4 border-2",
  md: "h-8 w-8 border-2",
  lg: "h-12 w-12 border-4",
};

export function Loader({ size = "md", className = "" }: LoaderProps) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={[
        "animate-spin rounded-full border-theme_1_15 border-t-theme_13_samecolour",
        sizeMap[size],
        className,
      ].join(" ")}
    />
  );
}

export function MainLoader() {
  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center z-50"
      style={{ background: "var(--theme_12)" }}
    >
      <div className="relative flex items-center justify-center">
        <img
          src="/logos/loader.png"
          alt="Loading"
          className="w-16 h-16 animate-spin object-contain"
        />
      </div>
    </div>
  );
}
