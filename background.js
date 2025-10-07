chrome.runtime.onInstalled.addListener(async () => {
    chrome.storage.sync.get(["lang"], (data) => {
        if (!data.lang) {
            const navLang = (chrome.i18n && chrome.i18n.getUILanguage
                ? chrome.i18n.getUILanguage()
                : navigator.language || "en").toLowerCase();

            const map = (l) => (l.startsWith("zh") ? "zh" : l.startsWith("ja") ? "ja" : "en");
            chrome.storage.sync.set({ lang: map(navLang) });
        }
    });
});
