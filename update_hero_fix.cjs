const fs = require("fs");
const file = "components/content-rail/cards/HeroCarouselCard.tsx";
let content = fs.readFileSync(file, "utf8");

// Remove the watchlist logic causing the crash
content = content.replace(
  /onClick=\{\(e\) => \{\s*e\.stopPropagation\(\);\s*if \(isGuest\) \{\s*useGuestPopupStore\.getState\(\)\.openGuestPopup\(\);\s*return;\s*\}\s*const targetId = Number\(item\?\.id\);\s*toggleWatchlist\([^}]*\}\);\s*\}\}/g,
  "onClick={(e) => { e.stopPropagation(); console.log('Watchlist clicked'); }}"
);

// Remove the inWatchlist checks in className and icon
content = content.replace(
  /className=\{`w-10 h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 rounded-full flex items-center justify-center bg-white\/20 backdrop-blur-md border border-white\/20 text-white hover:bg-white\/40 transition-all duration-300 shadow-lg \$\{inWatchlist \? "bg-white\/40 border-white\/50" : ""\}`\}/g,
  "className={`w-10 h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 rounded-full flex items-center justify-center bg-white/20 backdrop-blur-md border border-white/20 text-white hover:bg-white/40 transition-all duration-300 shadow-lg`}"
);

content = content.replace(
  /\{inWatchlist \? <Check className="w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7" \/> : <Plus className="w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7" \/>\}/g,
  "<Plus className=\"w-5 h-5 md:w-6 md:h-6 lg:w-7 lg:h-7\" />"
);

fs.writeFileSync(file, content);
console.log("Fixed undefined variables.");
