const fs = require("fs");
const path = require("path");
const glob = require("glob");
const sharp = require("sharp");
const nunjucks = require("nunjucks");

// Enable autoescaping for safety; mark trusted HTML with `| safe` in templates
nunjucks.configure("templates", { autoescape: true });

const issuesDir = path.join(__dirname, "issues");
const publicDir = path.join(__dirname, "public");

async function build() {
  // Clean and recreate public output to avoid stale files
  fs.rmSync(publicDir, { recursive: true, force: true });
  fs.mkdirSync(publicDir, { recursive: true });

  const issues = fs
    .readdirSync(issuesDir)
    .filter((d) => fs.lstatSync(path.join(issuesDir, d)).isDirectory())
    .sort();

  const issuesData = [];

  // Determine a single global aspect ratio for index covers (from first available 00.png)
  let globalCoverAspect = null;

  for (const issue of issues) {
    const src = path.join(issuesDir, issue);
    const out = path.join(publicDir, issue);
    // Clean the output directory for this issue to avoid stale files
    fs.rmSync(out, { recursive: true, force: true });
    fs.mkdirSync(out, { recursive: true });

    const thumbs = path.join(out, "thumbs");
    const optimized = path.join(out, "optimized");
    fs.mkdirSync(thumbs, { recursive: true });
    fs.mkdirSync(optimized, { recursive: true });

    const pageFiles = glob.sync("*.{jpg,png,JPG,PNG}", { cwd: src }).sort();

    const tasks = [];
    const pages = [];
    for (const file of pageFiles) {
      const sourceFile = path.join(src, file);
      const base = file.replace(/\.(png|jpg|jpeg)$/i, "");
      const outOriginal = path.join(out, file);
      const outThumb = path.join(thumbs, file);
      const outWebp = path.join(optimized, `${base}.webp`);

      // Copy original for fallback
      fs.copyFileSync(sourceFile, outOriginal);

      // Generate thumbnail (200px width)
      tasks.push(
        sharp(sourceFile)
          .resize({ width: 200 })
          .toFile(outThumb)
      );

      // Generate optimized WebP (up to 2560px width for sharper display on large/retina screens)
      tasks.push(
        sharp(sourceFile)
          .resize({ width: 2560, withoutEnlargement: true })
          .webp({ quality: 85 })
          .toFile(outWebp)
      );

      pages.push({ file, base, webp: `optimized/${base}.webp` });
    }

    // Await all image processing for this issue
    await Promise.all(tasks);

    // Determine title from optional title.txt; expect two lines: arc + cycle
    let arc = issue;
    let cycle = "";
    let title = issue;
    const titleTxt = path.join(src, "title.txt");
    if (fs.existsSync(titleTxt)) {
      const raw = fs.readFileSync(titleTxt, "utf8");
      const lines = raw
        .split(/\r?\n/) 
        .map((l) => l.trim())
        .filter(Boolean);
      arc = lines[0] || issue;
      cycle = lines[1] || "";
      title = cycle ? `${arc} — ${cycle}` : arc;
    }

    // First page as cover for index and (for first found) aspect ratio from source image
    const cover = pageFiles.length ? `${issue}/thumbs/${pageFiles[0]}` : null;
    if (pageFiles.length && !globalCoverAspect) {
      try {
        const md = await sharp(path.join(src, pageFiles[0])).metadata();
        if (md.width && md.height) {
          globalCoverAspect = `${md.width} / ${md.height}`;
        }
      } catch (e) {
        console.warn(`Failed to read cover metadata for ${issue}:`, e.message);
      }
    }

    // Accumulate issue metadata for index page
    issuesData.push({ id: issue, title, cover, arc, cycle });

    const html = nunjucks.render("issue.html", { issue, pages, title, arc, cycle });
    fs.writeFileSync(path.join(out, "index.html"), html);
  }

  const indexHtml = nunjucks.render("index.html", { issues: issuesData, index_aspect: globalCoverAspect });
  fs.writeFileSync(path.join(publicDir, "index.html"), indexHtml);

  // Render About page from optional JSON content
  let aboutData = null;
  try {
    const aboutJsonPath = path.join(__dirname, "content", "about.json");
    if (fs.existsSync(aboutJsonPath)) {
      const raw = fs.readFileSync(aboutJsonPath, "utf8");
      aboutData = JSON.parse(raw);
    }
  } catch (e) {
    console.warn("Failed to load about.json:", e.message);
  }

  const aboutHtml = nunjucks.render("about.html", { about: aboutData });
  fs.writeFileSync(path.join(publicDir, "about.html"), aboutHtml);

  // Copy site stylesheet
  try {
    fs.copyFileSync(
      path.join(__dirname, "templates", "styles.css"),
      path.join(publicDir, "styles.css")
    );
    // Copy theme script
    fs.copyFileSync(
      path.join(__dirname, "templates", "theme.js"),
      path.join(publicDir, "theme.js")
    );
  } catch (e) {
    // Styles are optional; log but don't fail build
    console.warn("Stylesheet missing or failed to copy:", e.message);
  }

  // Copy static assets (e.g., logo, fonts) from ./assets to public root
  try {
    const assetsDir = path.join(__dirname, "assets");
    if (fs.existsSync(assetsDir)) {
      const copyRecursive = (src, dest) => {
        const stat = fs.statSync(src);
        if (stat.isDirectory()) {
          fs.mkdirSync(dest, { recursive: true });
          for (const entry of fs.readdirSync(src)) {
            copyRecursive(path.join(src, entry), path.join(dest, entry));
          }
        } else {
          fs.copyFileSync(src, dest);
        }
      };
      // Copy into public root (assets/foo -> public/foo)
      for (const entry of fs.readdirSync(assetsDir)) {
        copyRecursive(path.join(assetsDir, entry), path.join(publicDir, entry));
      }
    }
  } catch (e) {
    console.warn("Failed to copy assets:", e.message);
  }
}

build().catch((err) => {
  console.error("Build failed:", err);
  process.exit(1);
});
