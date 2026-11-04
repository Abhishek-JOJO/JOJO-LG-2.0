import { SPLASH_LOGO_DATA_URI } from "./splashLogo";

/**
 * Launch splash, all CSS: the JOJO logo grows in and gently pulses on a black
 * curtain while the app loads, then zooms through its play button while the
 * curtain fades to reveal the page underneath.
 *
 * The curtain and logo (BOOT_CURTAIN_CSS) are inserted from <head> by
 * app/layout.tsx, so they are there from the first paint. BOOT_SPLASH_SCRIPT,
 * inlined at the top of <body>, adds the spinner and runs the hand-over.
 * SplashScreenVideo cleans up once the zoom is done.
 *
 * Not a video any more: a cold-starting Tizen 8 TV could only play the clip
 * 7-9s in, and one started while Home was rendering stuttered and sat frozen on
 * its last frame. CSS transform/opacity animations run on the compositor, so
 * they stay smooth while the app's startup work keeps the main thread busy.
 *
 * Signed-in users land on Home behind the splash: the logo stays up until Home
 * has painted its rows, so the zoom opens onto the page, not onto a skeleton.
 * Signed-out users go on to Login after a short logo.
 */

declare global {
  interface Window {
    /** Set by BOOT_SPLASH_SCRIPT once the zoom has finished. */
    __JOJO_SPLASH_DONE__?: boolean;
    /** Set by BOOT_SPLASH_SCRIPT; found here even while momentarily detached. */
    __JOJO_BOOT_SPLASH__?: { container: HTMLElement };
  }
}

export const BOOT_SPLASH_CONTAINER_ID = "jojo-splash-container";
export const SPLASH_DONE_EVENT = "jojo-splash-done";

const ZOOM_MS = 700;
// Signed-out users have no page to wait for; still show the logo this long.
const MIN_LOGO_MS = 1200;
// Never wait on the logo longer than this — the page's own loading states take over.
// Cold starts on a Tizen 8 TV painted Home 14-16s after launch.
const MAX_HOLD_MS = 15000;

/**
 * The boot curtain: solid black over the page, with the JOJO logo on its own
 * layer. Transform-only while waiting: the TV starts CSS animations late while
 * it is busy, and an opacity fade-in left the logo invisible until then. The
 * zoom's transform-origin is the play icon inside the logo.
 */
// Plain string concatenation only: joining template literals here (the logo's
// and ZOOM_MS's) made the production minifier drop the logo's background and
// animation from the built page — the TV showed the spinner with no logo.
export const BOOT_CURTAIN_CSS =
  "html,body{background:#000!important;overflow:hidden!important;}" +
  "body:before{content:'';position:fixed;inset:0;z-index:2147483646;background:#000;}" +
  "body:after{content:'';position:fixed;left:32.396vw;top:37.222vh;width:35.9375vw;height:26.111vh;z-index:2147483646;" +
  "background:url(" + SPLASH_LOGO_DATA_URI + ") center/100% 100% no-repeat;will-change:transform,opacity;transform-origin:79.4% 50%;" +
  "animation:jojoLogoIn .9s ease-out both,jojoLogoBreathe 1.4s ease-in-out .9s infinite alternate;}" +
  "html.jojo-splash-zoom body:after{animation:jojoLogoZoom " + ZOOM_MS + "ms cubic-bezier(.55,0,.9,.35) forwards;}" +
  "html.jojo-splash-zoom body:before{animation:jojoCurtainOut .4s ease-in .3s forwards;}" +
  // Signed out: the page under the curtain is about to be replaced by Login; keep it hidden.
  "html.jojo-splash-keep body:before{animation:none;opacity:1;}" +
  "html.jojo-splash-out body:before,html.jojo-splash-out body:after{animation:none;opacity:0;}" +
  "@keyframes jojoLogoIn{from{transform:scale(.88)}to{transform:scale(1)}}" +
  "@keyframes jojoLogoBreathe{from{transform:scale(1)}to{transform:scale(1.04)}}" +
  "@keyframes jojoLogoZoom{0%{transform:scale(1);opacity:1}75%{opacity:1}100%{transform:scale(16);opacity:0}}" +
  "@keyframes jojoCurtainOut{from{opacity:1}to{opacity:0}}";

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
c.style.cssText="position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:2147483647;pointer-events:none;";
// A CSS-only spinner keeps turning even while the app's startup work blocks the
// main thread (a still logo for seconds read as frozen).
var sp=document.createElement("div");
sp.style.cssText="position:absolute;left:50%;top:70%;width:48px;height:48px;margin:-24px 0 0 -24px;box-sizing:border-box;border-radius:50%;border:4px solid rgba(255,255,255,.18);border-top-color:#f26e21;animation:jojoSplashSpin .9s linear infinite;";
var ks=document.createElement("style");ks.textContent="@keyframes jojoSplashSpin{to{transform:rotate(360deg)}}";
document.head.appendChild(ks);
c.appendChild(sp);
var root=document.body||document.documentElement;
root.appendChild(c);
window.__JOJO_BOOT_SPLASH__={container:c};

var signedIn=false;
try{var tok=localStorage.getItem("ott_auth_token");var u=JSON.parse(localStorage.getItem("user")||"null");
signedIn=!!(tok&&u&&!u.isGuest&&(u.id||u.user_id||u.email||u.phone||u.profiles));}catch(e){}
var t0=Date.now(),zooming=false;
function zoom(){if(zooming)return;zooming=true;if(sp.parentNode)sp.parentNode.removeChild(sp);
  document.documentElement.classList.add("jojo-splash-zoom");if(!signedIn)document.documentElement.classList.add("jojo-splash-keep");
  setTimeout(function(){window.__JOJO_SPLASH_DONE__=true;document.dispatchEvent(new CustomEvent("${SPLASH_DONE_EVENT}"));},${ZOOM_MS});}
// Hand over once Home has actually painted its rows ("app ready" fired ~7s
// before them), so the zoom opens onto the page.
function painted(){return !!document.querySelector("section[data-section-index]");}
function wait(){if(zooming)return;var t=Date.now()-t0;
  if(t>=${MIN_LOGO_MS}&&(!signedIn||painted()||t>${MAX_HOLD_MS}))zoom();else setTimeout(wait,150);}
wait();
// When hydration fails React rebuilds <body>, deleting every node it didn't
// render (this splash included). Put it straight back.
if(window.MutationObserver){var mo=new MutationObserver(function(){
  if(!window.__SPLASH_VIDEO_ACTIVE__){mo.disconnect();return;}
  if(!root.contains(c))root.appendChild(c);
});mo.observe(root,{childList:true});}
}catch(e){}})();`;
