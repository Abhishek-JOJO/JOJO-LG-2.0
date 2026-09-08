import fs from 'fs';
import path from 'path';

/**
 * Recursively find all files in directory
 */
function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
  if (!fs.existsSync(dirPath)) return arrayOfFiles;
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getAllFiles(fullPath, arrayOfFiles);
    } else {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
}

/**
 * Transpile ECMAScript 2022 static { ... } blocks to static property assignments
 * Chrome 87 (webOS 22) does not support static initialization blocks
 */
function transpileStaticBlocks(jsContent: string): string {
  let index = jsContent.indexOf('static');
  while (index !== -1) {
    const slice = jsContent.slice(index);
    const match = slice.match(/^static\s*\{/);
    if (match) {
      const startBraceIndex = index + match[0].length - 1;
      let depth = 1;
      let i = startBraceIndex + 1;
      while (i < jsContent.length && depth > 0) {
        if (jsContent[i] === '{') depth++;
        else if (jsContent[i] === '}') depth--;
        i++;
      }
      if (depth === 0) {
        const blockContent = jsContent.slice(startBraceIndex + 1, i - 1).trim();
        const assignMatch = blockContent.match(/^this\.([a-zA-Z0-9_$]+)\s*=\s*([\s\S]+)$/);
        let replacement = jsContent.slice(index, i);
        if (assignMatch) {
          const propName = assignMatch[1];
          let propValue = assignMatch[2].trim();
          if (propValue.endsWith(';')) propValue = propValue.slice(0, -1);
          replacement = `static ${propName} = ${propValue};`;
        }
        jsContent = jsContent.slice(0, index) + replacement + jsContent.slice(i);
        index += replacement.length;
      } else {
        index += 6;
      }
    } else {
      index += 6;
    }
    index = jsContent.indexOf('static', index);
  }
  return jsContent;
}

function sanitizeTildeFilenames(outDir: string) {
  const allFiles = getAllFiles(outDir);
  const tildeMap = new Map<string, string>(); // oldBasename -> newBasename

  // Step 1: Rename files containing ~ to use _
  for (const filePath of allFiles) {
    const base = path.basename(filePath);
    if (base.includes('~')) {
      const newBase = base.replaceAll('~', '_');
      const newPath = path.join(path.dirname(filePath), newBase);
      fs.renameSync(filePath, newPath);
      tildeMap.set(base, newBase);
    }
  }

  if (tildeMap.size === 0) return;
  console.log(`[webOS Fix] Renamed ${tildeMap.size} files containing '~' to '_' for webOS file:// protocol compatibility.`);

  // Step 2: Replace references to old tilde filenames across all HTML, JS, CSS, and JSON files
  const updatedFiles = getAllFiles(outDir);
  for (const filePath of updatedFiles) {
    if (
      filePath.endsWith('.html') ||
      filePath.endsWith('.js') ||
      filePath.endsWith('.css') ||
      filePath.endsWith('.json')
    ) {
      let content = fs.readFileSync(filePath, 'utf8');
      let modified = false;
      for (const [oldName, newName] of tildeMap.entries()) {
        if (content.includes(oldName)) {
          content = content.replaceAll(oldName, newName);
          modified = true;
        }
      }
      if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
      }
    }
  }
}

export function fixWebOSPaths(outDir: string = path.resolve('./out')) {
  console.log('[webOS Fix] Fixing absolute paths, CSS color-mix webOS polyfills & React hydration scripts...');
  sanitizeTildeFilenames(outDir);
  const allFiles = getAllFiles(outDir);

  let htmlCount = 0;
  let jsCount = 0;
  let cssCount = 0;

  allFiles.forEach((filePath) => {
    const relFromOut = path.relative(outDir, filePath);
    const depth = relFromOut.split(path.sep).length - 1;
    const relPrefix = depth === 0 ? './' : '../'.repeat(depth);

    if (filePath.endsWith('.html')) {
      let content = fs.readFileSync(filePath, 'utf8');

      // 1. Next.js App Router chunks & flight payloads (escaped & unescaped)
      content = content.replaceAll('\\"/_next/', `\\"${relPrefix}_next/`);
      content = content.replaceAll('"/_next/', `"${relPrefix}_next/`);
      content = content.replaceAll('\'/_next/', `'${relPrefix}_next/`);
      content = content.replaceAll('href="/_next/', `href="${relPrefix}_next/`);
      content = content.replaceAll('src="/_next/', `src="${relPrefix}_next/`);

      // 2. Static public asset routes (escaped & unescaped)
      content = content.replaceAll('"/logos/', `"${relPrefix}logos/`);
      content = content.replaceAll('\\"/logos/', `\\"${relPrefix}logos/`);
      content = content.replaceAll('"/images/', `"${relPrefix}images/`);
      content = content.replaceAll('\\"/images/', `\\"${relPrefix}images/`);
      content = content.replaceAll('"/lottie/', `"${relPrefix}lottie/`);
      content = content.replaceAll('\\"/lottie/', `\\"${relPrefix}lottie/`);
      content = content.replaceAll('"/payment-icon/', `"${relPrefix}payment-icon/`);
      content = content.replaceAll('\\"/payment-icon/', `\\"${relPrefix}payment-icon/`);
      content = content.replaceAll('"/webOSTV.js"', `"${relPrefix}webOSTV.js"`);
      content = content.replaceAll('\\"/webOSTV.js\\"', `\\"${relPrefix}webOSTV.js\\"`);
      content = content.replaceAll('"/favicon.ico"', `"${relPrefix}favicon.ico"`);
      content = content.replaceAll('\\"/favicon.ico\\"', `\\"${relPrefix}favicon.ico\\"`);
      content = content.replaceAll('href="/favicon.ico"', `href="${relPrefix}favicon.ico"`);

      // 3. Strip crossorigin attributes for webOS file:// protocol CORS compatibility without breaking JSON syntax
      content = content.replaceAll('crossorigin=""', '');
      content = content.replaceAll('crossorigin="anonymous"', '');
      content = content.replaceAll('crossorigin="use-credentials"', '');
      content = content.replaceAll('crossOrigin=""', '');
      content = content.replaceAll('crossOrigin="anonymous"', '');
      content = content.replaceAll(',\\"crossOrigin\\":\\"\\"', '');
      content = content.replaceAll(',\\"crossOrigin\\":\\"anonymous\\"', '');
      content = content.replaceAll(',\\"crossOrigin\\":\\"$undefined\\"', '');
      content = content.replaceAll(',\\"crossorigin\\":\\"\\"', '');
      content = content.replaceAll(',\\"crossorigin\\":\\"anonymous\\"', '');
      content = content.replaceAll('{\\"crossOrigin\\":\\"\\",', '{');
      content = content.replaceAll('{\\"crossOrigin\\":\\"anonymous\\",', '{');
      content = content.replaceAll('{\\"crossOrigin\\":\\"$undefined\\",', '{');
      content = content.replaceAll('\\"crossOrigin\\":\\"\\"', '');
      content = content.replaceAll('\\"crossOrigin\\":\\"anonymous\\"', '');
      content = content.replaceAll('\\"crossOrigin\\":\\"$undefined\\"', '');

      // 4. Inject early runtime URL interceptor at the start of <head> to catch ANY dynamic root-relative URL
      const earlyInterceptorScript = `<script id="webos-early-boot">
(function(){
  if(typeof window==="undefined")return;
  var relRoot="${relPrefix}";
  var appBase=(typeof document!=="undefined"&&(document.baseURI||location.href))?new URL(relRoot,document.baseURI||location.href).href:relRoot;
  if(!appBase.endsWith("/"))appBase+="/";
  window.__WEBOS_APP_BASE__=appBase;

  function fixUrl(u){
    if(typeof u!=="string")return u;
    if(u.startsWith("file:///")){
      if(u.startsWith(appBase)||u.startsWith("file:///media/")||u.startsWith("file:///usr/"))return u;
      return appBase+u.slice(8);
    }
    if(u.startsWith("/_next/"))return appBase+u.slice(1);
    if(u.startsWith("/logos/")||u.startsWith("/images/")||u.startsWith("/lottie/")||u.startsWith("/payment-icon/")||u.startsWith("/player-icons/")||u==="/favicon.ico")return appBase+u.slice(1);
    if(u.startsWith("/")&&!u.startsWith("//")&&!u.startsWith("http://")&&!u.startsWith("https://"))return appBase+u.slice(1);
    return u;
  }

  function fixNavUrl(u){
    if(typeof u!=="string")return u;
    var clean=u;
    if(clean.startsWith("file:///")){
      if(clean.startsWith(appBase)||clean.startsWith("file:///usr/")||clean.startsWith("file:///media/"))return clean;
      clean=clean.slice(8);
    }
    if(clean.startsWith("/"))clean=clean.slice(1);
    var qIdx=clean.search(/[?#]/);
    var qh="";
    if(qIdx!==-1){qh=clean.slice(qIdx);clean=clean.slice(0,qIdx);}
    if(clean.endsWith("/"))clean=clean.slice(0,-1);
    if(!clean||clean==="")return appBase+"index.html"+qh;
    if(clean.endsWith(".html"))return appBase+clean+qh;
    return appBase+clean+"/index.html"+qh;
  }

  try{
    if(typeof Location!=="undefined"&&Location.prototype){
      var origProtoReplace=Location.prototype.replace;
      if(origProtoReplace){
        Location.prototype.replace=function(v){origProtoReplace.call(this,fixNavUrl(v));};
      }
      var origProtoAssign=Location.prototype.assign;
      if(origProtoAssign){
        Location.prototype.assign=function(v){origProtoAssign.call(this,fixNavUrl(v));};
      }
      var hDesc=Object.getOwnPropertyDescriptor(Location.prototype,"href");
      if(hDesc&&hDesc.set){
        var origH=hDesc.set;
        Object.defineProperty(Location.prototype,"href",{
          set:function(v){origH.call(this,fixNavUrl(v));},
          get:hDesc.get,
          configurable:true,
          enumerable:true
        });
      }
    }
    if(window.location){
      var origAssign=window.location.assign?window.location.assign.bind(window.location):null;
      if(origAssign){
        window.location.assign=function(v){origAssign(fixNavUrl(v));};
      }
      var origReplace=window.location.replace?window.location.replace.bind(window.location):null;
      if(origReplace){
        window.location.replace=function(v){origReplace(fixNavUrl(v));};
      }
    }
  }catch(e){}

  // TV Auth Gate: If unauthenticated on root index.html, immediately jump to login/index.html
  // Defer until DOMContentLoaded so WAM has committed the document frame before location.replace
  if ("${relPrefix}" === "./" && (location.pathname.endsWith("/index.html") || location.pathname.endsWith("/"))) {
    try {
      var _tok = localStorage.getItem("ott_auth_token");
      var _usr = localStorage.getItem("user");
      var _auth = false;
      if (_tok && _usr) {
        var _u = JSON.parse(_usr);
        if (_u && !_u.isGuest && (_u.id || _u.user_id || _u.email || _u.phone || _u.profiles)) {
          _auth = true;
        }
      }
      if (!_auth) {
        var targetLogin = appBase + "login/index.html";
        if (document.readyState === "loading") {
          document.addEventListener("DOMContentLoaded", function() {
            window.location.replace(targetLogin);
          });
        } else {
          window.location.replace(targetLogin);
        }
      }
    } catch(e) {}
  }

  try{
    var sDesc=Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype,"src");
    if(sDesc&&sDesc.set){
      var origS=sDesc.set;
      Object.defineProperty(HTMLScriptElement.prototype,"src",{set:function(v){origS.call(this,fixUrl(v))},get:sDesc.get,configurable:true,enumerable:true});
    }
    var lDesc=Object.getOwnPropertyDescriptor(HTMLLinkElement.prototype,"href");
    if(lDesc&&lDesc.set){
      var origL=lDesc.set;
      Object.defineProperty(HTMLLinkElement.prototype,"href",{set:function(v){origL.call(this,fixUrl(v))},get:lDesc.get,configurable:true,enumerable:true});
    }
    var iDesc=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,"src");
    if(iDesc&&iDesc.set){
      var origI=iDesc.set;
      Object.defineProperty(HTMLImageElement.prototype,"src",{set:function(v){origI.call(this,fixUrl(v))},get:iDesc.get,configurable:true,enumerable:true});
    }
    var origSetAttr=Element.prototype.setAttribute;
    Element.prototype.setAttribute=function(n,v){
      if((n==="src"||n==="href")&&typeof v==="string")v=fixUrl(v);
      return origSetAttr.call(this,n,v);
    };
    if(typeof window.fetch==="function"){
      var origF=window.fetch;
      window.fetch=function(inp,ini){
        if(typeof inp==="string")inp=fixUrl(inp);
        else if(inp&&typeof inp.url==="string"){
          var f=fixUrl(inp.url);
          if(f!==inp.url){try{inp=new Request(f,inp)}catch(e){}}
        }
        return origF.call(this,inp,ini);
      };
    }
  }catch(e){}
})();
</script>`;

      if (content.includes('id="webos-early-boot"')) {
        content = content.replace(/<script id="webos-early-boot">[\s\S]*?<\/script>/, earlyInterceptorScript);
      } else {
        content = content.replace('<head>', `<head>${earlyInterceptorScript}`);
      }

      fs.writeFileSync(filePath, content, 'utf8');
      htmlCount++;
    } else if (filePath.endsWith('.js')) {
      let content = fs.readFileSync(filePath, 'utf8');
      let modified = false;

      // Fix webOS 22 Chromium 87 syntax error: transpile ECMAScript 2022 static { ... } blocks
      if (content.includes('static')) {
        const prevContent = content;
        content = transpileStaticBlocks(content);
        if (content !== prevContent) {
          modified = true;
        }
      }

      // Fix Next.js getAssetPrefix() to always return relative prefix '.' instead of throwing InvariantError on file:// URLs
      if (content.includes('InvariantError') || content.includes('E784') || content.includes('document.currentScript')) {
        const prevContent = content;
        content = content.replace(
          /let\{pathname:[a-zA-Z0-9_$]+\}=new URL\([^)]+\)[\s\S]*?return [a-zA-Z0-9_$]+\.slice\(0,[a-zA-Z0-9_$]+\)/g,
          'return "."'
        );
        if (content !== prevContent) {
          modified = true;
        }
      }

      // Fix Turbopack base chunk loading prefix to dynamically resolve absolute file:// URL from document base URI
      const dynamicT = 'let t=(typeof window!=="undefined"&&window.__WEBOS_APP_BASE__)?(window.__WEBOS_APP_BASE__+"_next/"):(typeof document!=="undefined"&&(document.baseURI||location.href))?new URL("./_next/",document.baseURI||location.href).href:"./_next/"';
      if (content.includes('let t="/_next/"')) {
        content = content.replaceAll('let t="/_next/"', dynamicT);
        modified = true;
      }
      if (content.includes('let t = "/_next/"')) {
        content = content.replaceAll('let t = "/_next/"', dynamicT);
        modified = true;
      }
      if (content.includes('let t="./_next/"')) {
        content = content.replaceAll('let t="./_next/"', dynamicT);
        modified = true;
      }

      // Transpile Chromium 87 incompatible optional chaining ?. and ?? in Turbopack loader
      if (content.includes('document?.currentScript')) {
        content = content.replaceAll(
          'document?.currentScript?.getAttribute?.("src")??""',
          '("object"==typeof document&&document.currentScript?document.currentScript.getAttribute("src"):"")'
        );
        modified = true;
      }

      // Fix Turbopack chunk key resolution on file:// protocol URLs (matching D(q(n)).resolve() key with M() loader key)
      if (content.includes('r.startsWith(t)?r.slice(t.length):r')) {
        const oldCode = `let n=function(e){if("string"==typeof e)return e;let r=decodeURIComponent(e.src.replace(/[?#].*$/,""));return r.startsWith(t)?r.slice(t.length):r}(e);if(D("string"==typeof e?q(e):e.src).resolve()`;
        const newCode = `let n=function(e){if("string"==typeof e)return e;let r=decodeURIComponent(e.src.replace(/[?#].*$/,""));let i=r.indexOf("_next/");return i!==-1?r.slice(i+6):r.startsWith(t)?r.slice(t.length):r}(e);if(D(q(n)).resolve(),("object"==typeof e&&e&&e.src&&D(e.src).resolve())`;
        if (content.includes(oldCode)) {
          content = content.replace(oldCode, newCode);
          modified = true;
        }
      }

      // Ensure loadChunkCached normalizes absolute /_next/ chunk paths to local file:// URL
      if (content.includes('loadChunkCached:(e,t)=>(function(e,t){let r=D(t);')) {
        content = content.replace(
          'loadChunkCached:(e,t)=>(function(e,t){let r=D(t);',
          'loadChunkCached:(e,t)=>(function(e,t){let normT=(typeof t=="string"&&t.startsWith("/")&&typeof window!=="undefined"&&window.__WEBOS_APP_BASE__)?(window.__WEBOS_APP_BASE__+t.slice(1)):(typeof t=="string"&&t.startsWith("/")&&typeof document!=="undefined"&&(document.baseURI||location.href))?new URL("."+t,document.baseURI||location.href).href:t;let r=D(normT);t=normT;'
        );
        modified = true;
      }

      // Ensure R.L normalizes chunk paths passed to M
      if (content.includes('R.L=function(e){return M(i.Parent,this.m.id,e)}')) {
        content = content.replace(
          'R.L=function(e){return M(i.Parent,this.m.id,e)}',
          'R.L=function(e){let normE=(typeof e=="string"&&e.startsWith("/")&&typeof window!=="undefined"&&window.__WEBOS_APP_BASE__)?(window.__WEBOS_APP_BASE__+e.slice(1)):(typeof e=="string"&&e.startsWith("/")&&typeof document!=="undefined"&&(document.baseURI||location.href))?new URL("."+e,document.baseURI||location.href).href:e;return M(i.Parent,this.m.id,normE)}'
        );
        modified = true;
      }

      if (content.includes('__webpack_require__.p')) {
        content = content.replaceAll('__webpack_require__.p="/_next/"', '__webpack_require__.p="./_next/"');
        content = content.replaceAll('__webpack_require__.p = "/_next/"', '__webpack_require__.p = "./_next/"');
        content = content.replaceAll('__webpack_require__.p=""', '__webpack_require__.p="./"');
        modified = true;
      }

      if (content.includes('"/" + e + ".js"')) {
        content = content.replaceAll('"/" + e + ".js"', '"./" + e + ".js"');
        modified = true;
      }

      // Strip crossOrigin properties from dynamic script element creations in JS files
      if (content.includes('crossOrigin') || content.includes('crossorigin')) {
        content = content.replaceAll('.crossOrigin="anonymous"', '');
        content = content.replaceAll('.crossOrigin=""', '');
        content = content.replaceAll('.crossOrigin=e', '');
        content = content.replaceAll('.crossOrigin=t', '');
        content = content.replaceAll('.crossOrigin=r', '');
        content = content.replaceAll('crossorigin=""', '');
        content = content.replaceAll('crossorigin="anonymous"', '');
        modified = true;
      }

      if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        jsCount++;
      }
    } else if (filePath.endsWith('.css')) {
      let content = fs.readFileSync(filePath, 'utf8');
      let modified = false;

      // Fix relative font/image asset paths in CSS files
      if (content.includes('/_next/') || content.includes('/images/') || content.includes('/logos/')) {
        content = content.replaceAll('/_next/', `${relPrefix}_next/`);
        content = content.replaceAll('/images/', `${relPrefix}images/`);
        content = content.replaceAll('/logos/', `${relPrefix}logos/`);
        modified = true;
      }

      // Strip color-mix and lab @supports blocks that crash webOS Chromium 87 CSS parser
      if (content.includes('color-mix') || content.includes('color:lab')) {
        content = content.replace(/@supports\s*\([^)]*color-mix[^)]*\)\s*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/gi, '');
        content = content.replace(/@supports\s*\([^)]*color:lab[^)]*\)\s*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/gi, '');
        modified = true;
      }

      if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        cssCount++;
      }
    }
  });

  console.log(`[webOS Fix] Successfully processed ${htmlCount} HTML files, ${jsCount} JS files, and ${cssCount} CSS files for webOS TV!`);
}

if (process.argv[1]?.includes('fix-webos-paths')) {
  fixWebOSPaths();
}
