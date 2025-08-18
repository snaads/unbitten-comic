const fs = require("fs");
const path = require("path");
const glob = require("glob");
const sharp = require("sharp");
const nunjucks = require("nunjucks");

nunjucks.configure("templates", { autoescape: false });

const issuesDir = path.join(__dirname, "issues");
const publicDir = path.join(__dirname, "public");

function build() {
  fs.mkdirSync(publicDir, { recursive: true });

  const issues = fs.readdirSync(issuesDir)
    .filter((d) => fs.lstatSync(path.join(issuesDir, d)).isDirectory())
    .sort();

  issues.forEach((issue) => {
    const src = path.join(issuesDir, issue);
    const out = path.join(publicDir, issue);
    const thumbs = path.join(out, "thumbs");
    fs.mkdirSync(out, { recursive: true });
    fs.mkdirSync(thumbs, { recursive: true });

    const pages = glob.sync("*.{jpg,png}", { cwd: src }).sort();
    pages.forEach((file) => {
      const sourceFile = path.join(src, file);
      fs.copyFileSync(sourceFile, path.join(out, file));
      sharp(sourceFile).resize({ width: 200 }).toFile(path.join(thumbs, file));
    });

    const html = nunjucks.render("issue.html", { issue, pages });
    fs.writeFileSync(path.join(out, "index.html"), html);
  });

  const indexHtml = nunjucks.render("index.html", { issues });
  fs.writeFileSync(path.join(publicDir, "index.html"), indexHtml);

  fs.copyFileSync(
    path.join(__dirname, "templates", "about.html"),
    path.join(publicDir, "about.html")
  );
}

build();
