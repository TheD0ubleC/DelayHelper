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

chrome.storage.onChanged.addListener((changes) => {
  if (changes.enabled) settings.enabled = changes.enabled.newValue;
});

async function ping(url) {
  const start = performance.now();
  try { await fetch(url, { method: "GET", mode: "no-cors", cache: "no-cache" }); } catch { }
  const end = performance.now();
  return (end - start).toFixed(0);
}

function adjustColor(hex, percent) {
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

function insertLatency(node, latencyPromise) {
  if (!node || node.querySelector(".latency-badge")) return;

  const s = settings.style;
  const span = document.createElement("span");
  span.className = "latency-badge";
  span.textContent = "⏱ 0 ms";
  span.style.display = "inline-block";
  span.style.padding = "2px 6px";
  span.style.marginLeft = "8px";
  span.style.borderRadius = "8px";
  span.style.transition = "background-color .3s ease, color .3s ease, opacity .3s ease";
  span.style.color = s.fontColor;
  span.style.position = "relative";
  span.style.top = "-2px";
  span.style.verticalAlign = "middle";
  span.style.fontSize = (parseFloat(s.fontSize || "16") + 6) + "px";
  span.style.backgroundColor = adjustColor(s.bgColor, parseInt(s.brightness ?? 0, 10));
  if (s.fade) { span.style.opacity = "0"; requestAnimationFrame(() => span.style.opacity = "1"); }

  node.appendChild(span);

  let cur = 0, target = 0, running = true;
  const grow = () => {
    if (!running) return;
    cur += 5;
    if (cur > target) cur = target;
    span.textContent = `⏱ ${cur} ms`;
    if (cur < target) requestAnimationFrame(grow);
  };
  requestAnimationFrame(grow);

  latencyPromise.then((lat) => {
    target = parseInt(lat) || 0;
    running = false;

    const ease = () => {
      if (cur < target) {
        cur += Math.ceil((target - cur) / 10);
        if (cur > target) cur = target;
        span.textContent = `⏱ ${cur} ms`;
        requestAnimationFrame(ease);
      } else {
        span.textContent = `⏱ ${target} ms`;
        let bg = s.bgColor;
        if (s.dynamicColor) {
          if (target < 200) bg = "#d4edda";
          else if (target < 500) bg = "#fff3cd";
          else bg = "#f8d7da";
        }
        span.style.backgroundColor = adjustColor(bg, parseInt(s.brightness ?? 0, 10));
      }
    };
    requestAnimationFrame(ease);
  });
}

function scanGoogle() {
  const a1 = document.querySelectorAll('div.yuRUbf > a[href]:not([data-pinged])');
  a1.forEach(a => {
    const h3 = a.querySelector('h3');
    if (!h3 || h3.dataset.pinged === "1") return;
    if (!/^https?:\/\//.test(a.href)) return;
    h3.dataset.pinged = "1";
    a.dataset.pinged = "1";
    if (settings.enabled) insertLatency(h3, ping(a.href));
  });

  const a2 = document.querySelectorAll('a[href]:has(h3):not([data-pinged])');
  a2.forEach(a => {
    const h3 = a.querySelector('h3');
    if (!h3 || h3.dataset.pinged === "1") return;
    if (!/^https?:\/\//.test(a.href)) return;
    h3.dataset.pinged = "1";
    a.dataset.pinged = "1";
    if (settings.enabled) insertLatency(h3, ping(a.href));
  });

  const h3s = document.querySelectorAll('h3:not([data-pinged])');
  h3s.forEach(h3 => {
    const a = h3.closest('a[href]') || h3.parentElement?.querySelector('a[href]');
    if (!a || !/^https?:\/\//.test(a.href)) return;
    h3.dataset.pinged = "1";
    if (settings.enabled) insertLatency(h3, ping(a.href));
  });
}

function scanBing() {
  const anchors = document.querySelectorAll('.b_algo h2 a[href]:not([data-pinged])');
  anchors.forEach(a => {
    if (!/^https?:\/\//.test(a.href)) return;
    a.dataset.pinged = "1";
    if (settings.enabled) insertLatency(a.parentNode, ping(a.href));
  });
}
