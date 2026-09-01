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

export function fixWebOSPaths(outDir: string = path.resolve('./out')) {
  console.log('[webOS Fix] Fixing absolute paths, CSS color-mix webOS polyfills & React hydration scripts...');
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

      // 1. Standard HTML attributes
      content = content.replaceAll('"/_next/', `"${relPrefix}_next/`);
      content = content.replaceAll("'/_next/", `'${relPrefix}_next/`);
      content = content.replaceAll('href="/_next/', `href="${relPrefix}_next/`);
      content = content.replaceAll('src="/_next/', `src="${relPrefix}_next/`);

      // 2. Escaped JSON strings in Next.js Flight/RSC hydration payloads
      content = content.replaceAll('\\"/_next/', `\\"${relPrefix}_next/`);
      content = content.replaceAll('\\\\"/_next/', `\\\\"${relPrefix}_next/`);
      content = content.replaceAll('[\\"/_next/', `[\\"${relPrefix}_next/`);

      // 3. Static public asset routes
      content = content.replaceAll('"/logos/', `"${relPrefix}logos/`);
      content = content.replaceAll('\\"/logos/', `\\"${relPrefix}logos/`);
      content = content.replaceAll('"/images/', `"${relPrefix}images/`);
      content = content.replaceAll('\\"/images/', `\\"${relPrefix}images/`);
      content = content.replaceAll('"/lottie/', `"${relPrefix}lottie/`);
      content = content.replaceAll('\\"/lottie/', `\\"${relPrefix}lottie/`);
      content = content.replaceAll('"/webOSTV.js"', `"${relPrefix}webOSTV.js"`);
      content = content.replaceAll('"/favicon.ico"', `"${relPrefix}favicon.ico"`);

      fs.writeFileSync(filePath, content, 'utf8');
      htmlCount++;
    } else if (filePath.endsWith('.js')) {
      let content = fs.readFileSync(filePath, 'utf8');
      let modified = false;

      // Fix Turbopack document.currentScript.src assetPrefix invariant check
      if (content.includes('document.currentScript')) {
        content = content.replace(
          /if\s*\(!r\.startsWith\([a-zA-Z0-9_$]+\)\)\s*throw\s*Error\([`']Invariant:[^`']+[`']\);/g,
          ''
        );
        content = content.replace(
          /!r\.startsWith\(t\)/g,
          '!r.includes("_next/")'
        );
        modified = true;
      }

      if (content.includes('/_next/')) {
        content = content.replaceAll('"/_next/', '"./_next/');
        content = content.replaceAll("'/_next/", "'./_next/");
        content = content.replaceAll('\\"/_next/', '\\"./_next/');
        content = content.replaceAll('"/_next/"', '"./_next/"');
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
