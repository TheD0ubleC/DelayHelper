import os
import zipfile
from datetime import datetime
import json

FILES = [
    "manifest.json",
    "background.js",
    "content.js",
    "popup.html",
    "popup.js",
    "icon.png",
    "i18n",
]

OUTPUT_DIR = "dist"


def get_version():
    try:
        with open("manifest.json", "r", encoding="utf-8") as f:
            manifest = json.load(f)
            return manifest.get("version", "dev")
    except Exception as e:
        print(f"version read error: {e}")
        return "dev"


def zip_extension(version="dev"):
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)

    timestamp = datetime.now().strftime("%Y%m%d")
    zip_name = f"v{version}+{timestamp}.zip"
    zip_path = os.path.join(OUTPUT_DIR, zip_name)

    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zipf:
        for item in FILES:
            if os.path.isfile(item):
                zipf.write(item, arcname=item)
            elif os.path.isdir(item):
                for root, _, files in os.walk(item):
                    for f in files:
                        fullpath = os.path.join(root, f)
                        relpath = os.path.relpath(fullpath, ".")
                        zipf.write(fullpath, arcname=relpath)

    print(f"Done:{zip_path}")


if __name__ == "__main__":
    version = get_version()
    zip_extension(version)
