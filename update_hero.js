const fs = require("fs");
const file = "components/content-rail/cards/HeroCarouselCard.tsx";
let content = fs.readFileSync(file, "utf8");

const startToken = "        {/* Unified left side shadow (covering both poster & video) with 100% theme background start for seamless merge */}";

const endIndex = content.lastIndexOf("</div>\n    </div>\n  );\n}"); // approximate end
if (endIndex === -1) {
  console.log("Could not find end index");
  process.exit(1);
}

// Just slice from startToken to end of file, we will replace the whole bottom part.
const startIndex = content.indexOf(startToken);

const newBottom = `        {/* We keep a subtle left shadow just for text readability if needed, but Hotstar relies more on bottom shadow */}
        <div className="absolute inset-y-0 left-0 w-full sm:w-[50%] md:w-[45%] lg:w-[40%] xl:w-[35%] bg-gradient-to-r from-black/80 via-black/40 to-transparent z-10 pointer-events-none" />
      </motion.div>
      
      {/* Hotstar Bottom Gradient */}
      <div className="absolute inset-x-0 bottom-0 h-[60%] sm:h-[50%] bg-gradient-to-t from-black via-black/80 to-transparent z-10 pointer-events-none" />

      {/* Top Left Badge (Newly Added, etc.) */}
      {item?.asset_tags_badgeText && item.asset_tags_badgeText.toLowerCase().includes("new") && (
        <div className="absolute top-6 left-6 lg:top-8 lg:left-12 z-20 transition-opacity duration-700">
          <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 md:px-4 md:py-2 rounded-full border border-white/10 shadow-lg">
            <span className="text-sm md:text-base">🎉</span>
            <span className="text-white font-semibold text-xs md:text-sm tracking-wide capitalize">{item.asset_tags_badgeText}</span>
          </div>
        </div>
      )}

      {/* Top Right Badge (Disney+ Original / App Logo placeholder) */}
      <div className="absolute top-6 right-6 lg:top-8 lg:right-12 z-20">
        {/* Placeholder for network original logo if needed */}
      </div>

      <div
        className={\`absolute bottom-12 sm:bottom-16 lg:bottom-20 left-6 sm:left-8 lg:left-12 right-[120px] max-w-4xl text-left z-20 transition-all duration-700 ease-out \${isActive ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }\`}
      >
        {/* Title/Logo */}
        {config?.showTitle && (
          <div className={\`mb-4 transition-all duration-700 transform ease-out \${isActive ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"} delay-100\`}>
            {item?.title_image ? (
              <div className="relative w-full max-w-[260px] sm:max-w-[340px] md:max-w-[400px] h-[55px] sm:h-[75px] md:h-[90px]">
                <JOJOCommonImage
                  src={item.title_image}
                  alt={item.title}
                  fill
                  contentMode="contain"
                  position="left"
                  wrapperClassName="h-full w-full drop-shadow-[0_0_15px_rgba(0,0,0,0.8)]"
                />
              </div>
            ) : (
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-wide leading-tight drop-shadow-md">
                {item?.title}
              </h1>
            )}
          </div>
        )}

        {/* Metadata String: Year • Language • Genre 1 • Genre 2 */}
        <div className={\`mb-4 flex flex-wrap items-center font-semibold text-neutral-300 text-xs sm:text-sm md:text-base transition-all duration-700 transform ease-out \${isActive ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"} delay-200\`}>
          {item?.releaseYear && (
            <><span className="drop-shadow-md">{item.releaseYear}</span> <span className="mx-2 text-neutral-500">•</span></>
          )}
          {item?.language && (
            <><span className="drop-shadow-md">{item.language}</span> <span className="mx-2 text-neutral-500">•</span></>
          )}
          {item?.genres?.map((genre, i) => (
            <span key={i} className="flex items-center drop-shadow-md">
              {i > 0 && <span className="mx-2 text-neutral-500">•</span>}
              {genre}
            </span>
          ))}
        </div>

        {/* Call to Action: Subscribe to Watch */}
        <div className={\`flex items-center gap-2 transition-all duration-700 transform ease-out \${isActive ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"} delay-300\`}>
          {item?.isPremium ? (
             <>
               <span className="text-lg md:text-xl drop-shadow-md">👑</span>
               <span className="text-yellow-500 font-bold text-sm md:text-base tracking-wide drop-shadow-md">
                 Subscribe to Watch
               </span>
             </>
          ) : (
             <span className="text-white font-bold text-sm md:text-base tracking-wide drop-shadow-md">
               {buttonConfig.text === "Play" ? t("play") : t("watch_now")}
             </span>
          )}
        </div>
      </div>

      {/* Bottom Right Action Buttons */}
      <div
        className={\`absolute bottom-12 right-6 lg:bottom-16 lg:right-12 z-30 flex flex-col items-center gap-3 transition-all duration-700 transform ease-out \${isActive ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-6 scale-95"} delay-[400ms]\`}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (isGuest) {
              useGuestPopupStore.getState().openGuestPopup();
              return;
            }
            const targetId = Number(item?.id);
            toggleWatchlist(targetId, !inWatchlist, {
              title: item?.title,
              asset_title: item?.title,
              poster: item?.posterImage ? [{ url: item.posterImage, ratio_id: 3 }] : [],
              landscape: item?.landscapeImage ? [{ url: item.landscapeImage, ratio_id: 1 }] : [],
              image: item?.image,
              assetTypeCode: item?.assetTypeCode,
              description: item?.description,
            });
          }}
          className={\`w-10 h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 rounded-full flex items-center justify-center bg-white/20 backdrop-blur-md border border-white/20 text-white hover:bg-white/40 transition-all duration-300 shadow-lg \${inWatchlist ? "bg-white/40 border-white/50" : ""}\`}
        >
          {inWatchlist ? <Check className="w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7" /> : <Plus className="w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7" />}
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onClick?.();
          }}
          className="w-10 h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 rounded-full flex items-center justify-center bg-neutral-200 text-black hover:bg-white transition-all duration-300 shadow-xl hover:scale-110 active:scale-95"
        >
          <Play className="w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7 ml-1" fill="currentColor" />
        </button>
      </div>

    </div>
  );
}
`;

content = content.substring(0, startIndex) + newBottom;

fs.writeFileSync(file, content);
console.log("Updated HeroCarouselCard.");
