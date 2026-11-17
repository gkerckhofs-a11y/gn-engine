#!/usr/bin/env python3
"""Importer les vues publiques de planètes et de lieux depuis Drive pour Holopédia.
Réencoder localement les fichiers partagés en WebP, sans URLs Drive dans le site public.
"""
import io, json, os, re, urllib.request, urllib.error
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
    try:
        with urllib.request.urlopen(req, timeout=45) as response:
            b = response.read(12_000_000)
    except urllib.error.HTTPError as e:
        msg=e.read(2000).decode("utf-8",errors="replace")
        raise RuntimeError(f"Erreur Google Drive pour {slug}: HTTP {e.code}: {msg}") from None
    with Image.open(io.BytesIO(b)) as source:
        source.load()
        if source.width < 400 or source.height < 400:
            raise ValueError(f"Image trop petite: {slug}")
        picture = ImageOps.fit(source.convert("RGB"), (900,900), method=Image.Resampling.LANCZOS)
        picture.save(out / f"{slug}.webp", "WEBP", quality=82, method=6)
    print(f"{slug}: {len(b)} -> {(out / (slug + '.webp')).stat().st_size} bytes")
print(f"OK: {len(files)} vue(s) planétaire(s).")

# Trois photographies composites d'ambiance pour quatre fiches (bureau et docks
# partagent une vue d'ensemble). Préserver le cadrage paysage 16:9 de l'utilisateur.
places = json.loads(Path("assets-source/place-images.json").read_text(encoding="utf-8"))["place_images"]
place_out = Path("images/places")
place_out.mkdir(parents=True, exist_ok=True)
for slug, file_id in places.items():
    if not re.fullmatch(r"[a-z0-9-]{3,64}", slug) or not re.fullmatch(r"[A-Za-z0-9_-]{20,100}", file_id):
        raise ValueError("Invalid place image manifest entry")
    req = urllib.request.Request(
        f"https://www.googleapis.com/drive/v3/files/{file_id}?alt=media",
        headers={"Authorization": "Bearer " + token, "User-Agent": "Space-Outlaws-Holopedia/1.0"}
    )
    try:
        with urllib.request.urlopen(req, timeout=45) as response:
            raw = response.read(12_000_000)
    except urllib.error.HTTPError as e:
        msg = e.read(2000).decode("utf-8", errors="replace")
        raise RuntimeError(f"Erreur Google Drive pour le lieu {slug}: HTTP {e.code}: {msg}") from None
    with Image.open(io.BytesIO(raw)) as source:
        source.load()
        if source.width < 1200 or source.height < 650:
            raise ValueError(f"Illustration de lieu trop petite: {slug}")
        picture = ImageOps.fit(source.convert("RGB"), (1600, 900), method=Image.Resampling.LANCZOS)
        picture.save(place_out / f"{slug}.webp", "WEBP", quality=84, method=6)
    print(f"lieu {slug}: {len(raw)} -> {(place_out / (slug + '.webp')).stat().st_size} bytes")
print(f"OK: {len(places)} illustration(s) de lieux.")
