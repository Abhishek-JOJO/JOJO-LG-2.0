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
 * Signed-in users land on Home behind the splash. If Home isn't ready by the
 * time the steady JOJO logo is on screen, the video waits on the logo and only
 * plays its zoom-through ending once Home has its content
 * (signalSplashAppReady) — so the splash hands over to the page, not to a
 * black or skeleton screen. Signed-out users go on to Login, so it never waits.
 */

declare global {
  interface Window {
    __JOJO_APP_READY__?: boolean;
    __JOJO_SPLASH_FAILED__?: boolean;
  }
}

export const BOOT_SPLASH_CONTAINER_ID = "jojo-splash-container";
export const BOOT_SPLASH_VIDEO_ID = "jojo-splash-video";
export const SPLASH_APP_READY_EVENT = "jojo-app-ready";
export const SPLASH_FAILED_EVENT = "jojo-splash-failed";

// The 3.6s clip shows the steady logo from ~1.8s to ~3.1s, then zooms through
// the play icon. Hold mid-logo, leaving room for a late check to still land on it.
const HOLD_AT_SECONDS = 2.6;
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
c.style.cssText="position:fixed;top:0;left:0;width:100vw;height:100vh;background:#000;z-index:2147483647;transition:opacity 350ms ease-out;";
var v=document.createElement("video");
v.id="${BOOT_SPLASH_VIDEO_ID}";
v.muted=true;v.setAttribute("muted","");v.setAttribute("playsinline","");
v.preload="auto";v.disablePictureInPicture=true;
v.style.cssText="width:100%;height:100%;object-fit:cover;background:#000;";
v.src="./video/APP_INTRO.mp4";
c.appendChild(v);
(document.body||document.documentElement).appendChild(c);

var signedIn=false;
try{var tok=localStorage.getItem("ott_auth_token");var u=JSON.parse(localStorage.getItem("user")||"null");
signedIn=!!(tok&&u&&!u.isGuest&&(u.id||u.user_id||u.email||u.phone||u.profiles));}catch(e){}
var ready=!signedIn||window.__JOJO_APP_READY__===true;
var holding=false;
function release(){ready=true;if(holding){holding=false;var r=v.play();if(r&&r.catch)r.catch(function(){});}}
document.addEventListener("${SPLASH_APP_READY_EVENT}",release);
function watch(){
  if(ready||v.ended||v.paused)return;
  if(v.currentTime>=${HOLD_AT_SECONDS}){v.pause();holding=true;setTimeout(release,${MAX_HOLD_MS});return;}
  requestAnimationFrame(watch);
}
v.addEventListener("playing",function(){if(!ready&&!holding)requestAnimationFrame(watch);});
function fail(){window.__JOJO_SPLASH_FAILED__=true;document.dispatchEvent(new CustomEvent("${SPLASH_FAILED_EVENT}"));}
v.addEventListener("error",fail);
var p=v.play();if(p&&p.catch)p.catch(fail);
}catch(e){}})();`;
