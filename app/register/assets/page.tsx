"use client";

import {
    selectSelectedAvatar,
    selectSetSelectedAvatar,
    useRegisterStore,
} from "@/app/register/store";
import { JOJOButton, JOJOCustomButton } from "@/components/ui/JOJOButton";
import JOJOCommonImage, { JOJOImageContentMode, JOJOImageFallbackType, JOJOImageRadius } from "@/components/ui/JOJOCommonImage";
import { AVATARS } from "@/lib/utils";
import { useTranslations } from "next-intl";

export default function AvatarPage() {
    const t = useTranslations("createAccountPage");
    const selected = useRegisterStore(selectSelectedAvatar);
    const setSelected = useRegisterStore(selectSetSelectedAvatar);

    return (
        <div className="flex flex-col items-center w-full px-4 sm:px-6 md:px-8">

            {/* Title */}
            <h2 className="text-theme_1 text-xl sm:text-2xl font-semibold mb-6 sm:mb-8 text-center">
                {t("select_avatar")}
            </h2>

            {/* Avatar Grid */}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 sm:gap-4 w-full max-w-4xl">
                {AVATARS.map((avatar) => {
                    const isSelected = selected === avatar.id;

                    return (
                        <JOJOCustomButton
                            key={avatar.id}
                            size={JOJOButton.Size.M}
                            state={isSelected ? JOJOButton.State.ACTIVE : JOJOButton.State.DEFAULT}
                            type="button"
                            onClick={() => setSelected(avatar.id)}
                            className={`rounded-full p-1 aspect-square border-4 transition-all duration-200 h-auto w-full ${isSelected
                                ? "border-orange-500 scale-105"
                                : "border-transparent hover:border-orange-300"
                                }`}
                        >
                            <JOJOCommonImage
                                src={avatar.src}
                                altKey="img_avatar"
                                width={100}
                                height={100}
                                radius={JOJOImageRadius.Full}
                                contentMode={JOJOImageContentMode.Cover}
                                fallback={{ type: JOJOImageFallbackType.None }}
                                className="w-full h-full"
                            />
                        </JOJOCustomButton>
                    );
                })}
            </div>

            {/* CTA Button */}
            <div className="w-full flex justify-center max-w-md mt-8 sm:mt-10">
                <JOJOCustomButton
                    size={JOJOButton.Size.L}
                    state={selected === null ? JOJOButton.State.DISABLED : JOJOButton.State.ACTIVE}
                    disabled={selected === null}
                    className="w-1/4 py-3 h-auto"
                >
                    {t("choose")}
                </JOJOCustomButton>
            </div>
        </div>
    );
}