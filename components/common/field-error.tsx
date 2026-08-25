import { LOGOS } from "@/lib/constants/assets";
import JOJOCommonImage, { JOJOImagePreset } from "../ui/JOJOCommonImage";

export function FieldError({ msg }: { msg: string }) {
    return (
        <div role="alert" className="mt-1 text-xs text-theme_14_samecolour flex items-center gap-1.5">
            <JOJOCommonImage
                src={LOGOS.ERROR_ICON}
                altKey="img_jojo_logo"
                width={12}
                height={12}
                preset={JOJOImagePreset.Logo}
                wrapperClassName="size-3 flex-shrink-0"
            />
            {msg}
        </div>
    );
}