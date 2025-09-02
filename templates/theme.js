(() => {
  const STORAGE_KEY = "theme";

  function getStoredTheme() {
    try { return localStorage.getItem(STORAGE_KEY) || "light"; } catch { return "light"; }
  }

  function storeTheme(theme) {
    try { localStorage.setItem(STORAGE_KEY, theme); } catch {}
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    // Swap logo assets
    document.querySelectorAll("img.logo-img").forEach((img) => {
      const src = img.getAttribute("src") || "";
      const lastSlash = src.lastIndexOf("/");
      const dir = lastSlash >= 0 ? src.slice(0, lastSlash + 1) : "";
      const file = lastSlash >= 0 ? src.slice(lastSlash + 1) : src;
      let newFile = file;
      if (theme === "dark") {
        newFile = file.replace("logo.png", "logo_white.png");
      } else {
        newFile = file.replace("logo_white.png", "logo.png");
      }
      const target = dir + newFile;
      if (target !== src) img.setAttribute("src", target);
    });
    // Reflect state on toggle button
    const btn = document.getElementById("themeToggle");
    if (btn) btn.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
  }

  function init() {
    const current = getStoredTheme();
    applyTheme(current);
    const btn = document.getElementById("themeToggle");
    if (btn) {
      btn.addEventListener("click", () => {
        const next = (document.documentElement.getAttribute("data-theme") === "dark") ? "light" : "dark";
        applyTheme(next);
        storeTheme(next);
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

