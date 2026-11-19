#!/usr/bin/env python3
"""
Fetch all products from the operator API, search for a real image for each
(using the z-ai image-search CLI), and update each product's imageUrl.
"""
import json
import subprocess
import urllib.request
import time
import re

BASE = "http://localhost:81"

SEARCH_QUERIES = {
    "Joggo Maize Meal 1kg": "maize meal flour pack 1kg bag",
    "Mumias White Sugar 1kg": "white sugar 1kg packet",
    "Flynn Cooking Oil 1L": "vegetable cooking oil bottle 1 litre",
    "Ketepa Fahari Tea 250g": "tea leaves pack 250g Kenya brand",
    "Sukuma Wiki (Bunch)": "sukuma wiki kales fresh green bunch",
    "Tomatoes 1kg": "fresh red tomatoes pile market",
    "Bananas (Hand)": "ripe yellow bananas bunch fruit",
    "Coca-Cola 500ml": "Coca-Cola soda bottle 500ml",
    "Ilara Fresh Milk 500ml": "fresh milk carton packet 500ml",
    "Supaloaf Bread 400g": "sliced white bread loaf",
    "Omo Detergent 1kg": "washing powder detergent 1kg pack box",
    "Geisha Soap 800g": "toilet soap bar family pack",
    "Rosy Toilet Paper 4 rolls": "toilet tissue paper rolls pack",
    "Bingo Wafers 24g": "chocolate wafers snack pack",
    "Fresh Sukuma Wiki": "kales fresh green vegetables bunch",
}

def get_cookie():
    cookie_file = "/tmp/hustlecart-cookie.txt"
    with open(cookie_file) as f:
        for line in f:
            if "hc_session" in line and "\t" in line:
                parts = line.strip().split("\t")
                if len(parts) >= 2 and parts[-2] == "hc_session":
                    return parts[-1]
    return None

def api(path, method="GET", body=None, cookie=None):
    headers = {}
    if cookie:
        headers["Cookie"] = f"hc_session={cookie}"
    data = None
    if body is not None:
        data = json.dumps(body).encode()
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(f"{BASE}{path}", data=data, method=method, headers=headers)
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())

def search_image(query):
    """Call z-ai image-search CLI and return the first result's URL."""
    try:
        result = subprocess.run(
            ["z-ai", "image-search", "-q", query, "-c", "1", "--no-rank", "--gl", "us"],
            capture_output=True, text=True, timeout=120
        )
        if result.returncode != 0:
            print(f"  CLI error: {result.stderr[:200]}")
            return None
        # The CLI prints status lines (emojis) before the JSON.
        # Extract just the JSON block from stdout.
        stdout = result.stdout
        # Find the first '{' and extract from there to the end.
        json_start = stdout.find("{")
        if json_start == -1:
            print("  No JSON in output")
            return None
        json_str = stdout[json_start:]
        data = json.loads(json_str)
        if data.get("success") and data.get("results"):
            url = data["results"][0]["original_url"]
            if url and url.startswith("http"):
                return url
        print(f"  No results for: {query}")
        return None
    except subprocess.TimeoutExpired:
        print(f"  Timeout for: {query}")
        return None
    except Exception as e:
        print(f"  Error: {e}")
        return None

def main():
    cookie = get_cookie()
    if not cookie:
        print("No cookie found. Sign in as operator first.")
        return

    data = api("/api/operator/products", cookie=cookie)
    products = data.get("products", [])
    print(f"Found {len(products)} products\n")

    updated = 0
    for p in products:
        name = p["name"]
        if p.get("imageUrl"):
            print(f"SKIP (has image): {name}")
            continue

        query = SEARCH_QUERIES.get(name, name)
        print(f"Searching: {name}")
        print(f"  Query: '{query}'")

        url = search_image(query)
        if url:
            print(f"  Found: {url[:80]}...")
            try:
                api(f"/api/operator/products/{p['id']}", "PATCH",
                    {"imageUrl": url}, cookie=cookie)
                print(f"  Updated: {name}")
                updated += 1
            except Exception as e:
                print(f"  Failed to update: {e}")
        else:
            print(f"  No image found")

        time.sleep(2)

    print(f"\nDone! Updated {updated}/{len(products)} products with real images.")

if __name__ == "__main__":
    main()
