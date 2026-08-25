"use client";

import { JOJOFlagEmoji } from "@/components/ui/JOJOFlagEmoji";
import { JOJOButton, JOJOCustomButton } from "@/components/ui/JOJOButton";
import { JOJOCustomInput, JOJOInput } from "@/components/ui/JOJOInput";
import { Country } from "@/features/country/model/types";
import { cn, isPossiblePhoneInput, tryNormalizePhoneNumber } from "@/lib/utils";
import { CountryWithEmailInputProps } from "@/types/global.types";
import { ChevronDown, Search } from "lucide-react";
import {
    forwardRef,
    useEffect,
    useMemo,
    useRef,
    useState,
    KeyboardEvent,
    ChangeEvent,
} from "react";
import { appConfig } from "@/lib/config/app.config";

const CountryWithEMailInput = forwardRef<
    HTMLInputElement,
    CountryWithEmailInputProps
>(function CountryWithEMailInput(
    {
        value,
        onChange,
        error = false,
        showCountryCode = false,
        countries,
        countriesLoading = false,
        countriesError,
        phoneCode,
        selectedCountryCode,
        defaultCountryCode = appConfig?.DEFAULT_COUNTRY_NAME,
        onCountryChange,
        searchPlaceholder,
        loadingText,
        failedText,
        noCountriesText,
        className,
        wrapperClassName,
        disabled,
        ...props
    },
    ref
) {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [focusedIndex, setFocusedIndex] = useState<number>(-1);

    const dropdownRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

    const countryList = useMemo(() => countries ?? [], [countries]);

    const activeCountryCode = useMemo(() => {
        return (selectedCountryCode || defaultCountryCode || appConfig.DEFAULT_COUNTRY_NAME).toUpperCase();
    }, [selectedCountryCode, defaultCountryCode]);

    // const selectedCountry = useMemo(() => {
    //     return countryList.find(
    //         (country) =>
    //             country.country_code.toUpperCase() === activeCountryCode
    //     );
    // }, [countryList, activeCountryCode]);

    const filteredCountries = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();

        if (!query) return countryList;

        return countryList.filter((country) => {
            return (
                country?.country_name?.toLowerCase()?.includes(query) ||
                country?.country_code?.toLowerCase()?.includes(query) ||
                String(country?.phone_code)?.toLowerCase()?.includes(query)
            );
        });
    }, [countryList, searchQuery]);

    /**
     * True = phone-like input
     * False = email/text input
     *
     * Examples:
     * 9876543210      => true
     * 919876543210    => true
     * +919876543210   => true
     * test@gmail.com  => false
     */
    const isPhoneInput = useMemo(() => {
        return isPossiblePhoneInput(value);
    }, [value]);

    const shouldShowCountrySelector = showCountryCode && isPhoneInput;

    const normalizedPhone = useMemo(() => {
        if (!shouldShowCountrySelector) return null;

        return tryNormalizePhoneNumber(value, activeCountryCode);
    }, [value, activeCountryCode, shouldShowCountrySelector]);

    useEffect(() => {
        if (!shouldShowCountrySelector) {
            setDropdownOpen(false);
            setSearchQuery("");
            setFocusedIndex(-1);
        }
    }, [shouldShowCountrySelector]);

    useEffect(() => {
        if (!dropdownOpen) return;

        function onOutside(event: MouseEvent) {
            const target = event.target as Node;

            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(target) &&
                triggerRef.current &&
                !triggerRef.current.contains(target)
            ) {
                closeDropdown();
            }
        }

        document.addEventListener("mousedown", onOutside);

        return () => {
            document.removeEventListener("mousedown", onOutside);
        };
    }, [dropdownOpen]);

    useEffect(() => {
        if (focusedIndex >= 0 && itemRefs.current[focusedIndex]) {
            itemRefs.current[focusedIndex]?.scrollIntoView({
                block: "nearest",
            });
        }
    }, [focusedIndex]);

    useEffect(() => {
        setFocusedIndex(-1);
    }, [searchQuery]);

    const closeDropdown = () => {
        setDropdownOpen(false);
        setSearchQuery("");
        setFocusedIndex(-1);
    };

    const handleDropdownOpen = () => {
        if (disabled) return;

        setDropdownOpen((prev) => {
            const next = !prev;

            if (!next) {
                setSearchQuery("");
                setFocusedIndex(-1);
            }

            return next;
        });
    };

    const handleCountrySelect = (country: Country) => {
        onCountryChange({
            phone_code: country?.phone_code,
            country_code: country?.country_code,
        });

        closeDropdown();
    };

    const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
        onChange?.(event);
    };

    const handleSearchKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (!dropdownOpen) return;

        switch (e.key) {
            case "ArrowDown": {
                e.preventDefault();

                if (filteredCountries.length === 0) return;

                setFocusedIndex((prev) =>
                    prev < filteredCountries.length - 1 ? prev + 1 : 0
                );
                break;
            }

            case "ArrowUp": {
                e.preventDefault();

                if (filteredCountries.length === 0) return;

                setFocusedIndex((prev) =>
                    prev > 0 ? prev - 1 : filteredCountries.length - 1
                );
                break;
            }

            case "Enter": {
                e.preventDefault();

                if (focusedIndex >= 0 && filteredCountries[focusedIndex]) {
                    handleCountrySelect(filteredCountries[focusedIndex]);
                }

                break;
            }

            case "Escape": {
                e.preventDefault();
                closeDropdown();
                triggerRef.current?.focus();
                break;
            }
        }
    };

    const handleItemKeyDown = (
        e: KeyboardEvent<HTMLDivElement>,
        country: Country
    ) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleCountrySelect(country);
        }
    };

    return (
        <div
            className={cn(
                "flex items-center h-13 rounded-full bg-theme_10 border relative overflow-visible",
                error ? "border-theme_14_samecolour" : "border-none",
                wrapperClassName
            )}
        >
            {shouldShowCountrySelector && (
                <div className="relative h-full flex items-center shrink-0">
                    <JOJOCustomButton
                        ref={triggerRef}
                        size={JOJOButton.Size.S}
                        state={JOJOButton.State.DEFAULT}
                        type="button"
                        disabled={disabled}
                        aria-haspopup="listbox"
                        aria-expanded={dropdownOpen}
                        onClick={handleDropdownOpen}
                        hoverColor="none"
                        className="h-full border-none bg-transparent body-sm-medium text-theme_13_samecolour font-bold px-3.5 flex items-center gap-1 cursor-pointer"
                    >
                        {/* Optional flag */}
                        {/* <JOJOFlagEmoji
                            countryCode={
                                selectedCountry
                                    ? selectedCountry.country_code
                                    : defaultCountryCode
                            }
                            size={20}
                            shape="square"
                            className="mr-1"
                        /> */}

                        <ChevronDown
                            size={24}
                            className="transition-transform duration-200"
                            style={{
                                transform: dropdownOpen
                                    ? "rotate(180deg)"
                                    : "rotate(0deg)",
                            }}
                        />

                        {phoneCode}
                    </JOJOCustomButton>
                </div>
            )}

            <JOJOCustomInput
                ref={ref}
                state={JOJOInput.State.DEFAULT}
                value={value}
                onChange={handleInputChange}
                disabled={disabled}
                aria-invalid={error}
                data-normalized-phone={normalizedPhone?.international ?? ""}
                className={cn(
                    `flex-1 h-full border-none outline-none bg-theme_10 px-4.5 min-w-0 body-sm-regular placeholder:text-theme_7 text-theme_1 ${shouldShowCountrySelector ? "pl-0" : ""
                    }`,
                    className
                )}
                {...props}
            />

            {shouldShowCountrySelector && dropdownOpen && (
                <div
                    ref={dropdownRef}
                    role="listbox"
                    aria-label="Select country"
                    className="
                        absolute
                        left-0
                        top-full
                        mt-1.5
                        w-full min-w-[280px] max-w-[calc(100vw-4rem)]
                        sm:min-w-[320px] sm:max-w-[360px]
                        lg:w-[400px]
                        max-h-75
                        overflow-hidden
                        rounded-2xl
                        bg-theme_10
                        border border-theme_9
                        shadow-lg
                        z-[9999]
                        flex flex-col
                    "
                >
                    <div className="p-2 border-b border-theme_9 sticky top-0 bg-theme_10">
                        <div className="relative">
                            <Search
                                size={16}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-theme_5 pointer-events-none"
                            />

                            <JOJOCustomInput
                                ref={searchInputRef}
                                state={JOJOInput.State.DEFAULT}
                                type="text"
                                placeholder={searchPlaceholder}
                                value={searchQuery}
                                onChange={(event) =>
                                    setSearchQuery(event.target.value)
                                }
                                onKeyDown={handleSearchKeyDown}
                                className="w-full h-9 pl-9 pr-3 rounded-lg bg-theme_9 border-none border-theme_9 text-sm text-theme_1 placeholder:text-theme_5 outline-none focus:border-theme_13_samecolour transition-colors"
                                autoFocus
                            />
                        </div>
                    </div>

                    <div ref={listRef} className="overflow-y-auto p-2 flex-1">
                        {countriesLoading ? (
                            <div className="px-3 py-2.5 text-sm text-theme_5 text-center">
                                {loadingText}
                            </div>
                        ) : countriesError ? (
                            <div className="px-3 py-2.5 text-sm text-theme_14_samecolour text-center">
                                {failedText}
                            </div>
                        ) : filteredCountries.length > 0 ? (
                            filteredCountries.map((country, index) => {
                                const isSelected =
                                    country.country_code.toUpperCase() ===
                                    activeCountryCode;

                                const isFocused = focusedIndex === index;

                                return (
                                    <div
                                        key={`${country.country_code}-${country.phone_code}-${index}`}
                                        ref={(el) => {
                                            itemRefs.current[index] = el;
                                        }}
                                        role="option"
                                        aria-selected={isSelected}
                                        tabIndex={-1}
                                        onClick={() =>
                                            handleCountrySelect(country)
                                        }
                                        onKeyDown={(e) =>
                                            handleItemKeyDown(e, country)
                                        }
                                        onMouseEnter={() =>
                                            setFocusedIndex(index)
                                        }
                                        className={cn(
                                            "w-full border-none px-3 py-2.5 rounded-[10px] text-left cursor-pointer text-sm transition-colors duration-150 flex items-center gap-2",
                                            isSelected
                                                ? "bg-theme_9 text-theme_13_samecolour font-semibold"
                                                : isFocused
                                                    ? "bg-theme_9 text-theme_1 font-normal"
                                                    : "bg-transparent text-theme_1 font-normal hover:bg-theme_9"
                                        )}
                                    >
                                        <JOJOFlagEmoji
                                            countryCode={country?.country_code}
                                            size={20}
                                            shape="square"
                                        />

                                        <span className="flex-1">
                                            {country?.country_name}
                                        </span>

                                        <span
                                            className={cn(
                                                "text-xs font-medium px-1.5 py-0.5 rounded",
                                                isSelected
                                                    ? "text-theme_13_samecolour"
                                                    : "text-theme_5"
                                            )}
                                        >
                                            {country.country_code}
                                        </span>

                                        <span className="text-theme_5 text-xs">
                                            {country?.phone_code}
                                        </span>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="px-3 py-2.5 text-sm text-theme_5 text-center">
                                {noCountriesText}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
});

CountryWithEMailInput.displayName = "CountryWithEMailInput";

export default CountryWithEMailInput;