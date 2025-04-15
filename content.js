let settings = {
  enabled: true,
  style: {
    fontSize: "16",
    bgColor: "#d4edda",
    fontColor: "#444444",
    dynamicColor: true,
    brightness: 0,
    fade: false
  }
};

chrome.storage.sync.get(["enabled", "style"], (data) => {
  settings.enabled = data.enabled ?? true;
  settings.style = { ...settings.style, ...(data.style ?? {}) };

  if (settings.enabled) {
    const runner = location.hostname.includes("google")
      ? scanGoogle
      : location.hostname.includes("bing")
        ? scanBing
        : null;

    if (runner) setInterval(runner, 1500);
  }
});

async function ping(url) {
  const start = performance.now();
  try {
    await fetch(url, { method: "GET", mode: "no-cors", cache: "no-cache" });
    const end = performance.now();
    return (end - start).toFixed(0);
  } catch {
    const end = performance.now();
    return (end - start).toFixed(0) + "+";
  }
}

function adjustColor(hex, percent) {
  const num = parseInt(hex.replace("#", ""), 16);
  let r = (num >> 16) + percent;
  let g = ((num >> 8) & 0x00FF) + percent;
  let b = (num & 0x0000FF) + percent;
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return `rgb(${r},${g},${b})`;
}

function insertLatency(node, latency) {
  const span = document.createElement("span");
  span.className = "latency-badge";
  span.textContent = `⏱ ${latency} ms`;

  const delay = parseInt(latency);
  const s = settings.style;

  span.style.cssText = `
    display: inline-block;
    padding: 2px 6px;
    margin-left: 6px;
    border-radius: 6px;
    font-size: ${s.fontSize}px;
    color: ${s.fontColor};
    transition: all 0.3s ease;
  `;

  let bg = s.bgColor;
  if (s.dynamicColor) {
    if (delay < 200) bg = "#d4edda";
    else if (delay < 500) bg = "#fff3cd";
    else bg = "#f8d7da";
  }
  span.style.backgroundColor = adjustColor(bg, parseInt(s.brightness));

  if (s.fade) {
    span.style.opacity = "0";
    requestAnimationFrame(() => {
      span.style.opacity = "1";
    });
  }

  node.appendChild(span);
}

async function scanGoogle() {
  const titles = document.querySelectorAll("h3.LC20lb:not([data-pinged])");

  for (let h3 of titles) {
    const a = h3.closest("a");
    if (!a || !a.href || !a.href.startsWith("http")) continue;

    h3.dataset.pinged = "1";

    ping(a.href).then((latency) => {
      if (settings.enabled) insertLatency(h3, latency);
    });
  }
}

async function scanBing() {
  const results = document.querySelectorAll(".b_algo h2 a:not([data-pinged])");
  for (let a of results) {
    a.dataset.pinged = "1";
    const url = a.href;
    ping(url).then((latency) => settings.enabled && insertLatency(a.parentNode, latency));
  }
}
