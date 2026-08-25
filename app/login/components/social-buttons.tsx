import JOJOCommonImage from "@/components/ui/JOJOCommonImage";

export default function SocialBtn({ src, altKey }: { src: string; altKey: string }) {
    return (
        <span
            aria-label={altKey}
            className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-theme_10_50 shrink-0"
        >
            <JOJOCommonImage src={src} altKey={altKey} width={20} height={20} style={{ objectFit: "contain" }} />
        </span>
    );
}