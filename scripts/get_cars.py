#!/usr/bin/env python3

import io
import json
import time
import zipfile
import random
from pathlib import Path

import requests
from PIL import Image, ImageOps

API = "https://commons.wikimedia.org/w/api.php"

OUT = Path("vehicle-photos")
OUT.mkdir(exist_ok=True)

CARS = {
    "amc-gremlin-1974.jpg": "1974 AMC Gremlin",
    "bmw-3-series-2009.jpg": "2009 BMW 3 Series",
    "buick-lacrosse-2010.jpg": "2010 Buick LaCrosse",
    "chevrolet-corvair-1965.jpg": "1965 Chevrolet Corvair",
    "chevrolet-monte-carlo-1999.jpg": "1999 Chevrolet Monte Carlo",
    "chrysler-300-2006.jpg": "2006 Chrysler 300",
    "chrysler-sebring-2004.jpg": "2004 Chrysler Sebring",
    "dodge-neon-2002.jpg": "2002 Dodge Neon",
    "ford-f-150-2007.jpg": "2007 Ford F-150",
    "ford-pinto-1976.jpg": "1976 Ford Pinto",
    "ford-taurus-2001.jpg": "2001 Ford Taurus",
    "honda-accord-2008.jpg": "2008 Honda Accord",
    "honda-civic-2005.jpg": "2005 Honda Civic",
    "kia-rio-2010.jpg": "2010 Kia Rio",
    "lincoln-town-car-2003.jpg": "2003 Lincoln Town Car",
    "nissan-xterra-2006.jpg": "2006 Nissan Xterra",
    "pontiac-trans-am-1987.jpg": "1987 Pontiac Trans Am",
    "porsche-boxster-2008.jpg": "2008 Porsche Boxster",
    "saab-9-3-2006.jpg": "2006 Saab 9-3",
    "subaru-outback-2010.jpg": "2010 Subaru Outback",
    "toyota-prius-2009.jpg": "2009 Toyota Prius",
    "toyota-yaris-2007.jpg": "2007 Toyota Yaris",
    "volkswagen-beetle-2008.jpg": "2008 Volkswagen Beetle",
    "volkswagen-jetta-2005.jpg": "2005 Volkswagen Jetta",
}

session = requests.Session()
session.headers.update({
    "User-Agent": "vehicle-photo-fetcher/1.0 (personal project)"
})


def get_with_retry(url, *, params=None, timeout=60, max_retries=8):
    """GET with exponential backoff for Wikimedia rate limiting."""
    for attempt in range(max_retries):
        r = session.get(url, params=params, timeout=timeout)

        if r.status_code != 429:
            r.raise_for_status()
            return r

        retry_after = r.headers.get("Retry-After")

        if retry_after:
            wait = float(retry_after)
        else:
            # 5, 10, 20, 40... seconds, plus a little jitter
            wait = min(5 * (2 ** attempt), 120) + random.uniform(0, 3)

        print(f"  Wikimedia rate limit — waiting {wait:.1f}s...")
        time.sleep(wait)

    raise RuntimeError("Wikimedia rate limit persisted after retries")


def commons_search(query, limit=15):
    params = {
        "action": "query",
        "generator": "search",
        "gsrsearch": f'{query} filetype:bitmap',
        "gsrnamespace": 6,
        "gsrlimit": limit,
        "prop": "imageinfo",
        "iiprop": "url|size|mime|extmetadata",
        "format": "json",
        "formatversion": 2,
    }

    r = get_with_retry(API, params=params, timeout=30)

    pages = r.json().get("query", {}).get("pages", [])
    candidates = []

    for page in pages:
        ii = page.get("imageinfo", [{}])[0]

        if ii.get("mime") not in ("image/jpeg", "image/png", "image/webp"):
            continue

        width = ii.get("width", 0)
        height = ii.get("height", 0)

        if width < 1200 or height < 700:
            continue

        metadata = ii.get("extmetadata", {})

        candidates.append({
            "title": page.get("title", ""),
            "url": ii.get("url"),
            "width": width,
            "height": height,
            "license": metadata.get("LicenseShortName", {}).get("value", ""),
            "artist": metadata.get("Artist", {}).get("value", ""),
            "description_url": ii.get("descriptionurl", ""),
        })

    return candidates


def candidate_score(candidate, query):
    """
    Favor:
      - exact year/model words in filename
      - landscape orientation
      - approximately 3:2 images
      - larger originals
    """
    title = candidate["title"].lower()
    words = query.lower().replace("-", " ").split()

    score = 0

    for word in words:
        if word in title:
            score += 10

    w = candidate["width"]
    h = candidate["height"]

    if w > h:
        score += 20

    ratio = w / h
    target = 1.5
    score -= abs(ratio - target) * 10

    if w >= 2000:
        score += 5

    if w >= 3000:
        score += 5

    return score


def download_image(url):
    r = get_with_retry(url, timeout=120)
    return Image.open(io.BytesIO(r.content))


def make_1200x800(img):
    """
    Convert to RGB and crop to exactly 3:2.

    ImageOps.fit crops excess edges instead of distorting the car.
    """
    img = ImageOps.exif_transpose(img).convert("RGB")

    return ImageOps.fit(
        img,
        (1200, 800),
        method=Image.Resampling.LANCZOS,
        centering=(0.5, 0.5),
    )


manifest = []

for index, (filename, query) in enumerate(CARS.items(), start=1):

    destination = OUT / filename

    if destination.exists():
        try:
            with Image.open(destination) as existing:
                if existing.size == (1200, 800):
                    print(f"\n[{index:02d}/{len(CARS)}] {query}")
                    print(f"  ✓ Already exists — skipping")
                    continue
        except Exception:
            pass
    
    print(f"\n[{index:02d}/{len(CARS)}] {query}")

    candidates = commons_search(query)

    if not candidates:
        print("  !! No suitable high-resolution Commons result")
        manifest.append({
            "filename": filename,
            "query": query,
            "status": "NOT FOUND",
        })
        continue

    candidates.sort(
        key=lambda x: candidate_score(x, query),
        reverse=True
    )

    chosen = candidates[0]

    print(f"  Source: {chosen['title']}")
    print(f"  Original: {chosen['width']}x{chosen['height']}")
    print(f"  License: {chosen['license']}")
    print(f"  Downloading...")

    try:
        img = download_image(chosen["url"])
        final = make_1200x800(img)

        destination = OUT / filename

        final.save(
            destination,
            "JPEG",
            quality=92,
            optimize=True,
            progressive=True,
        )

        print(f"  ✓ {destination} — 1200x800")

        manifest.append({
            "filename": filename,
            "query": query,
            "commons_file": chosen["title"],
            "source": chosen["description_url"],
            "original_url": chosen["url"],
            "original_size": f"{chosen['width']}x{chosen['height']}",
            "license": chosen["license"],
            "artist": chosen["artist"],
            "status": "OK",
        })

    except Exception as e:
        print(f"  !! ERROR: {e}")
        manifest.append({
            "filename": filename,
            "query": query,
            "status": f"ERROR: {e}",
        })

    # Be polite to Commons.
    time.sleep(random.uniform(3, 6))


# Write source/license manifest.
manifest_path = OUT / "sources.json"

with manifest_path.open("w") as f:
    json.dump(manifest, f, indent=2)


# ZIP everything.
zip_path = Path("vehicle-photos-1200x800.zip")

with zipfile.ZipFile(
    zip_path,
    "w",
    compression=zipfile.ZIP_DEFLATED
) as z:
    for path in OUT.iterdir():
        z.write(path, arcname=path.name)


successful = sum(x["status"] == "OK" for x in manifest)

print()
print("=" * 60)
print(f"Finished: {successful}/{len(CARS)} images")
print(f"Folder:   {OUT.resolve()}")
print(f"ZIP:      {zip_path.resolve()}")
print("=" * 60)