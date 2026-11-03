/**
 * Launch splash (public/video/APP_INTRO.mp4).
 *
 * It is started by BOOT_SPLASH_SCRIPT, inlined at the top of <body>
 * (app/layout.tsx), not by React: waiting for the JS bundle to load and
 * hydrate before even creating the <video> left a black screen for seconds on
 * TV hardware. The element is never rendered by React (a React-rendered
 * splash restarted when hydration took it over on webOS); SplashScreenVideo
 * adopts it once mounted and dismisses it.
 *
 * Signed-in users land on Home behind the splash. The JOJO logo (the video's
 * poster) stays on screen until Home has its content (signalSplashAppReady),
 * and only then does the clip play its zoom-through — so the splash hands over
 * to the page, not to a black or skeleton screen. Signed-out users go on to
 * Login, so it plays at once.
 */

declare global {
  interface Window {
    __JOJO_APP_READY__?: boolean;
    __JOJO_SPLASH_FAILED__?: boolean;
    /** Set by BOOT_SPLASH_SCRIPT; found here even while momentarily detached. */
    __JOJO_BOOT_SPLASH__?: { container: HTMLElement; video: HTMLVideoElement };
  }
}

export const BOOT_SPLASH_CONTAINER_ID = "jojo-splash-container";
export const BOOT_SPLASH_VIDEO_ID = "jojo-splash-video";
export const SPLASH_APP_READY_EVENT = "jojo-app-ready";
export const SPLASH_FAILED_EVENT = "jojo-splash-failed";

// The 1.4s clip opens on the JOJO logo, zooms through its play icon and ends
// on that bright frame (cut from the original 3.6s, whose first 1.4s and last
// 0.1s were black). Its poster is that first frame, so the logo shows as soon
// as the page paints — decoding the first frame took ~1.3s more on a Tizen 8 TV.
export const SPLASH_VIDEO_SRC = "./video/APP_INTRO.mp4";
export const SPLASH_POSTER_SRC = "./video/APP_INTRO_poster.jpg";
// Never wait on the logo longer than this — the page's own loading states take over.
const MAX_HOLD_MS = 4000;

/** Home has its content: let a waiting splash play its ending. */
export function signalSplashAppReady(): void {
  if (typeof window === "undefined" || window.__JOJO_APP_READY__) return;
  window.__JOJO_APP_READY__ = true;
  document.dispatchEvent(new CustomEvent(SPLASH_APP_READY_EVENT));
}

/**
 * Inline, so plain ES5: it runs before (and without) the app bundle, on old
 * TV engines. `window.__SPLASH_VIDEO_ACTIVE__` is set by the early boot script
 * in <head> only when the splash should play (first launch of this session,
 * entry document).
 */
export const BOOT_SPLASH_SCRIPT = `(function(){try{
if(!window.__SPLASH_VIDEO_ACTIVE__)return;
var c=document.createElement("div");
c.id="${BOOT_SPLASH_CONTAINER_ID}";
// The poster is also the container background: drawn as a page layer, it shows
// even where the video element (a TV media plane) has no frame yet.
c.style.cssText="position:fixed;top:0;left:0;width:100vw;height:100vh;background:#000 url(${SPLASH_POSTER_SRC}) center/cover no-repeat;z-index:2147483647;transition:opacity 350ms ease-out;";
var v=document.createElement("video");
v.id="${BOOT_SPLASH_VIDEO_ID}";
v.muted=true;v.setAttribute("muted","");v.setAttribute("playsinline","");
v.preload="auto";v.disablePictureInPicture=true;
v.style.cssText="width:100%;height:100%;object-fit:cover;background:transparent;";
v.poster="${SPLASH_POSTER_SRC}";
v.src="${SPLASH_VIDEO_SRC}";
c.appendChild(v);
var root=document.body||document.documentElement;
root.appendChild(c);
window.__JOJO_BOOT_SPLASH__={container:c,video:v};

var signedIn=false;
try{var tok=localStorage.getItem("ott_auth_token");var u=JSON.parse(localStorage.getItem("user")||"null");
signedIn=!!(tok&&u&&!u.isGuest&&(u.id||u.user_id||u.email||u.phone||u.profiles));}catch(e){}
function fail(){window.__JOJO_SPLASH_FAILED__=true;document.dispatchEvent(new CustomEvent("${SPLASH_FAILED_EVENT}"));}
v.addEventListener("error",fail);
// Held on the poster, not paused mid-clip: the page's startup work kept the
// main thread too busy to stop the video at a set time.
var started=false;
function start(){if(started)return;started=true;var p=v.play();if(p&&p.catch)p.catch(fail);}
document.addEventListener("${SPLASH_APP_READY_EVENT}",start);
if(!signedIn||window.__JOJO_APP_READY__===true)start();else setTimeout(start,${MAX_HOLD_MS});
// When hydration fails React rebuilds <body>, deleting every node it didn't
// render (this splash included). Put it straight back and keep it playing.
if(window.MutationObserver){var mo=new MutationObserver(function(){
  if(!window.__SPLASH_VIDEO_ACTIVE__){mo.disconnect();return;}
  if(root.contains(c))return;
  root.appendChild(c);
  if(started&&!v.ended){var r=v.play();if(r&&r.catch)r.catch(function(){});}
});mo.observe(root,{childList:true});}
}catch(e){}})();`;
