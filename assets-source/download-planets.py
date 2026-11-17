#!/usr/bin/env python3
"""Importer les vues orbitales depuis les fichiers Drive partagés à l'agent de publication.
Copie uniquement les images autorisées, réencode en WebP et rejette les corps invalides.
"""
import io, json, os, re, urllib.request
from pathlib import Path
from PIL import Image, ImageOps

manifest = json.loads(Path("assets-source/planet-images.json").read_text(encoding="utf-8"))
files = manifest["planet_images"]
token = os.environ["GOOGLE_DRIVE_ACCESS_TOKEN"]
out = Path("images/planets")
out.mkdir(parents=True, exist_ok=True)
for slug, file_id in files.items():
    if not re.fullmatch(r"[a-z0-9-]{3,48}", slug) or not re.fullmatch(r"[A-Za-z0-9_-]{20,100}", file_id):
        raise ValueError("Invalid image manifest entry")
    url = f"https://www.googleapis.com/drive/v3/files/{file_id}?alt=media"
    req = urllib.request.Request(url, headers={"Authorization": "Bearer " + token, "User-Agent": "Space-Outlaws-Holopedia/1.0"})
    with urllib.request.urlopen(req, timeout=45) as response:
        b = response.read(12_000_000)
    with Image.open(io.BytesIO(b)) as source:
        source.load()
        if source.width < 400 or source.height < 400:
            raise ValueError(f"Image trop petite: {slug}")
        picture = ImageOps.fit(source.convert("RGB"), (900,900), method=Image.Resampling.LANCZOS)
        picture.save(out / f"{slug}.webp", "WEBP", quality=82, method=6)
    print(f"{slug}: {len(b)} -> {(out / (slug + '.webp')).stat().st_size} bytes")
print(f"OK: {len(files)} vue(s) planétaire(s).")
