const toggle = document.getElementById("toggle");
const fontSizeInput = document.getElementById("fontSize");
const bgColorInput = document.getElementById("bgColor");
const fontColorInput = document.getElementById("fontColor");
const dynamicColorInput = document.getElementById("dynamicColor");
const brightnessInput = document.getElementById("brightness");
const fadeInput = document.getElementById("fade");

const previewBadge = document.getElementById("previewBadge");
const themeBtn = document.getElementById("theme-toggle");
const htmlEl = document.documentElement;

const toast = document.getElementById("toast");
const bgPreview = document.getElementById("bgPreview");
const bgFixedPreview = document.getElementById("bgFixedPreview");
const fontPreview = document.getElementById("fontPreview");

const langSelect = document.getElementById("lang");

const B = v => (typeof v === "boolean" ? v : v === "true" ? true : v === "false" ? false : !!v);
const N = (v, d = 0) => { const n = parseInt(v, 10); return Number.isFinite(n) ? n : d; };
const debounce = (fn, wait = 550) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), wait); }; };

function adjustBrightness(hex, percent) {
  const num = parseInt(hex.replace("#", ""), 16);
  let r = (num >> 16) & 255;
  let g = (num >> 8) & 255;
  let b = num & 255;

  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  l = Math.max(0, Math.min(1, l + percent / 100));

  function hue2rgb(p, q, t) {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  }

  let r2, g2, b2;
  if (s === 0) {
    r2 = g2 = b2 = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r2 = hue2rgb(p, q, h + 1 / 3);
    g2 = hue2rgb(p, q, h);
    b2 = hue2rgb(p, q, h - 1 / 3);
  }

  return `rgb(${Math.round(r2 * 255)},${Math.round(g2 * 255)},${Math.round(b2 * 255)})`;
}

function showToast(msg) {
  if (!toast) {
    console.warn("toast element not found");
    return;
  }
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 1400);
}



let I18N = null;
let CURRENT_LANG = "en";

async function loadI18n() {
  if (I18N) return I18N;
  const url = chrome.runtime.getURL("i18n/translations.json");
  const res = await fetch(url);
  I18N = await res.json();
  return I18N;
}
function detectLang() {
  const lang = (navigator.language || "en").toLowerCase();
  if (lang.startsWith("zh")) return "zh";
  if (lang.startsWith("ja")) return "ja";
  return "en";
}
function t(key) {
  const dict = (I18N && I18N[CURRENT_LANG]) || {};
  return dict[key] ?? key;
}
function applyI18nToDOM() {
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const k = el.getAttribute("data-i18n");
    if (!k) return;
    el.textContent = t(k);
  });
  themeBtn.title = t("theme");
  if (!toast.textContent || toast.textContent.trim() === "" || toast.classList.contains("show") === false) {
    toast.textContent = t("saved");
  }
}

async function initLang() {
  await loadI18n();
  chrome.storage.sync.get(["lang"], (data) => {
    if (data.lang) {
      CURRENT_LANG = data.lang;
    } else {
      CURRENT_LANG = detectLang();
      chrome.storage.sync.set({ lang: CURRENT_LANG });
    }
    langSelect.value = CURRENT_LANG;
    applyI18nToDOM();
  });

  langSelect.addEventListener("change", () => {
    CURRENT_LANG = langSelect.value;
    chrome.storage.sync.set({ lang: CURRENT_LANG }, () => {
      applyI18nToDOM();
      showToast(t("savedTheme"));
    });
  });
}

function uiToStyle() {
  return {
    fontSize: String(fontSizeInput.value || 16),
    bgColor: bgColorInput.value || "#d4edda",
    fontColor: fontColorInput.value || "#444444",
    dynamicColor: !!dynamicColorInput.checked,
    brightness: N(brightnessInput.value, 0),
    fade: !!fadeInput.checked
  };
}

function renderPreview(style, targetDelay = 123) {
  const dynamicColor = B(style.dynamicColor ?? true);
  const brightness = N(style.brightness ?? 0, 0);
  const fontSize = parseFloat(style.fontSize ?? 16);
  const fontColor = style.fontColor || "#444444";
  let baseBg = style.bgColor || "#d4edda";

  bgFixedPreview.style.background = baseBg;
  fontPreview.style.background = fontColor;

  const getVar = k => getComputedStyle(document.documentElement).getPropertyValue(k).trim();
  const colorByDelay = d => {
    if (!dynamicColor) return baseBg;
    if (d < 200) return getVar("--good") || "#d4edda";
    if (d < 500) return getVar("--warn") || "#fff3cd";
    return getVar("--bad") || "#f8d7da";
  };

  previewBadge.style.fontSize = `${fontSize + 6}px`;
  previewBadge.style.color = fontColor;

  let cur = 0;
  previewBadge.textContent = `⏱ 0 ms`;
  const tick = () => {
    cur += Math.max(1, Math.ceil((targetDelay - cur) / 12));
    if (cur > targetDelay) cur = targetDelay;
    const bg = adjustBrightness(colorByDelay(cur), brightness);
    previewBadge.style.backgroundColor = bg;
    bgPreview.style.background = bg;
    previewBadge.textContent = `⏱ ${cur} ms`;
    if (cur < targetDelay) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function saveAll() {
  chrome.storage.sync.get(["enabled", "style", "theme", "lang"], (data) => {
    const next = { ...(data.style || {}), ...uiToStyle() };
    chrome.storage.sync.set({
      enabled: !!toggle.checked,
      style: next,
      theme: data.theme || (htmlEl.getAttribute("data-theme") || "light"),
      lang: data.lang || CURRENT_LANG
    }, () => {
      renderPreview(next);
      showToast(t("saved"));
    });
  });
}
const saveAllDebounced = debounce(saveAll, 550);

function applyTheme(theme) {
  htmlEl.setAttribute("data-theme", theme);
  themeBtn.textContent = theme === "dark" ? "🌞" : "🌙";
}
function initTheme() {
  chrome.storage.sync.get(["theme"], (data) => {
    let theme = data.theme;
    if (!theme) {
      const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
      theme = prefersDark ? "dark" : "light";
    }
    applyTheme(theme);
  });

  themeBtn.addEventListener("click", () => {
    const next = (htmlEl.getAttribute("data-theme") || "light") === "light" ? "dark" : "light";
    applyTheme(next);
    chrome.storage.sync.set({ theme: next }, () => showToast(t("savedTheme")));
  });
}


function initSettings() {
  chrome.storage.sync.get(["enabled", "style"], (data) => {
    const s = data.style || {};
    toggle.checked = B(data.enabled ?? true);
    fontSizeInput.value = s.fontSize ?? 16;
    bgColorInput.value = s.bgColor ?? "#d4edda";
    fontColorInput.value = s.fontColor ?? "#444444";
    dynamicColorInput.checked = B(s.dynamicColor ?? true);
    brightnessInput.value = N(s.brightness ?? 0, 0);
    fadeInput.checked = B(s.fade ?? false);
    renderPreview(s, 123);
  });

  [
    toggle, fontSizeInput, bgColorInput, fontColorInput,
    dynamicColorInput, brightnessInput, fadeInput
  ].forEach(el => {
    el.addEventListener("input", () => {
      renderPreview(uiToStyle());
      saveAllDebounced();
    });
  });
}

(async function boot() {
  await initLang();
  initTheme();
  initSettings();
})();
