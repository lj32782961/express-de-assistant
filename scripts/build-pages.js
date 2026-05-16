const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const publicDir = path.join(rootDir, "public");

function copyRecursive(source, target) {
  if (/\scopy\.[^.]+$/i.test(path.basename(source))) {
    return;
  }

  const stat = fs.statSync(source);

  if (stat.isDirectory()) {
    fs.mkdirSync(target, { recursive: true });
    for (const entry of fs.readdirSync(source)) {
      copyRecursive(path.join(source, entry), path.join(target, entry));
    }
    return;
  }

  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

fs.rmSync(distDir, { recursive: true, force: true });
fs.mkdirSync(distDir, { recursive: true });

copyRecursive(publicDir, distDir);
fs.copyFileSync(path.join(rootDir, "index.html"), path.join(distDir, "index.html"));

const adsFile = path.join(rootDir, "Ads.txt");
if (fs.existsSync(adsFile)) {
  fs.copyFileSync(adsFile, path.join(distDir, "Ads.txt"));
}

console.log("Cloudflare Pages build complete: dist/");
