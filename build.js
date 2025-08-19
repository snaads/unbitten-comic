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
  fs.mkdirSync(publicDir, { recursive: true });

  const issues = fs
    .readdirSync(issuesDir)
    .filter((d) => fs.lstatSync(path.join(issuesDir, d)).isDirectory())
    .sort();

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

      // Generate optimized WebP (up to 1600px width)
      tasks.push(
        sharp(sourceFile)
          .resize({ width: 1600, withoutEnlargement: true })
          .webp({ quality: 80 })
          .toFile(outWebp)
      );

      pages.push({ file, base, webp: `optimized/${base}.webp` });
    }

    // Await all image processing for this issue
    await Promise.all(tasks);

    const html = nunjucks.render("issue.html", { issue, pages });
    fs.writeFileSync(path.join(out, "index.html"), html);
  }

  const indexHtml = nunjucks.render("index.html", { issues });
  fs.writeFileSync(path.join(publicDir, "index.html"), indexHtml);

  fs.copyFileSync(
    path.join(__dirname, "templates", "about.html"),
    path.join(publicDir, "about.html")
  );
}

build().catch((err) => {
  console.error("Build failed:", err);
  process.exit(1);
});
