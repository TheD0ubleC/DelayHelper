const toggle = document.getElementById("toggle");
const fontSizeInput = document.getElementById("fontSize");
const bgColorInput = document.getElementById("bgColor");
const fontColorInput = document.getElementById("fontColor");
const dynamicColorInput = document.getElementById("dynamicColor");
const brightnessInput = document.getElementById("brightness");
const fadeInput = document.getElementById("fade");
const preview = document.querySelector(".latency-badge");

function applyPreview(style, simulatedDelay = 123) {
  const delay = parseInt(simulatedDelay);
  const fontSize = style.fontSize || 16;
  let bgColor = style.bgColor || "#d4edda";
  const fontColor = style.fontColor || "#444";
  const dynamicColor = style.dynamicColor ?? true;
  const brightness = parseInt(style.brightness ?? 0);
  const useFade = style.fade ?? false;

  if (dynamicColor) {
    if (delay < 200) bgColor = "#d4edda";
    else if (delay < 500) bgColor = "#fff3cd";
    else bgColor = "#f8d7da";
  }

  preview.textContent = `⏱ ${delay} ms`;
  preview.style.fontSize = fontSize + "px";
  preview.style.backgroundColor = adjustColorBrightness(bgColor, brightness);
  preview.style.color = fontColor;
  preview.style.opacity = useFade ? "0" : "1";

  if (useFade) {
    setTimeout(() => {
      preview.style.opacity = "1";
    }, 30);
  }
}

function adjustColorBrightness(hex, percent) {
  const num = parseInt(hex.replace("#", ""), 16);
  let r = (num >> 16) + percent;
  let g = ((num >> 8) & 0x00FF) + percent;
  let b = (num & 0x0000FF) + percent;
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return `rgb(${r},${g},${b})`;
}

function saveAll() {
  const style = {
    fontSize: fontSizeInput.value,
    bgColor: bgColorInput.value,
    fontColor: fontColorInput.value,
    dynamicColor: dynamicColorInput.checked,
    brightness: brightnessInput.value,
    fade: fadeInput.checked
  };
  chrome.storage.sync.set({
    enabled: toggle.checked,
    style
  });
  applyPreview(style);
}

[fontSizeInput, bgColorInput, fontColorInput, dynamicColorInput, brightnessInput, fadeInput].forEach(el => {
  el.addEventListener("input", saveAll);
});

toggle.addEventListener("change", saveAll);

chrome.storage.sync.get(["enabled", "style"], (data) => {
  toggle.checked = data.enabled ?? true;
  const style = data.style ?? {};
  fontSizeInput.value = style.fontSize ?? 16;
  bgColorInput.value = style.bgColor ?? "#d4edda";
  fontColorInput.value = style.fontColor ?? "#444444";
  dynamicColorInput.checked = style.dynamicColor ?? true;
  brightnessInput.value = style.brightness ?? 0;
  fadeInput.checked = style.fade ?? false;
  applyPreview(style);
});
