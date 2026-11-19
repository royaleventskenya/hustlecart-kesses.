#!/usr/bin/env python3
"""Add test products via the HustleCart API. Run after signing up a vendor."""
import json
import urllib.request

BASE = "http://localhost:81"

def main():
    cookie_file = "/tmp/hustlecart-cookie.txt"
    cookie_value = None
    try:
        with open(cookie_file) as f:
            for line in f:
                # curl's Netscape format may prefix the line with "#HttpOnly_"
                # which contains "#" — but the hc_session cookie line still
                # has the cookie name + value as the last two tab-separated
                # fields. Look for hc_session regardless of leading #.
                if "hc_session" in line and "\t" in line:
                    parts = line.strip().split("\t")
                    if len(parts) >= 2 and parts[-2] == "hc_session":
                        cookie_value = parts[-1]
                        break
    except FileNotFoundError:
        pass
    if not cookie_value:
        print("No cookie found. Please sign up first.")
        return

    req = urllib.request.Request(f"{BASE}/api/categories")
    with urllib.request.urlopen(req) as r:
        cats_data = json.loads(r.read())
    cats = {c["slug"]: c["id"] for c in cats_data["categories"]}
    print(f"Got {len(cats)} categories: {list(cats.keys())}")

    products = [
        {"name": "Joggo Maize Meal 1kg", "description": "Stone-ground maize flour, perfect for ugali. Pack of 1kg.", "price": 180, "originalPrice": 220, "stock": 40, "categoryId": cats["groceries"]},
        {"name": "Mumias White Sugar 1kg", "description": "Refined white sugar, 1kg pack.", "price": 165, "originalPrice": None, "stock": 30, "categoryId": cats["groceries"]},
        {"name": "Flynn Cooking Oil 1L", "description": "Refined vegetable cooking oil, 1 litre.", "price": 380, "originalPrice": 450, "stock": 18, "categoryId": cats["groceries"]},
        {"name": "Ketepa Fahari Tea 250g", "description": "Premium Kenyan black tea leaves, 250g.", "price": 145, "originalPrice": None, "stock": 22, "categoryId": cats["groceries"]},
        {"name": "Sukuma Wiki (Bunch)", "description": "Fresh kales bunch, harvested this morning.", "price": 30, "originalPrice": None, "stock": 35, "categoryId": cats["fresh-produce"]},
        {"name": "Tomatoes 1kg", "description": "Ripe red tomatoes, 1kg net.", "price": 90, "originalPrice": 120, "stock": 24, "categoryId": cats["fresh-produce"]},
        {"name": "Bananas (Hand)", "description": "Sweet ripe bananas, one hand.", "price": 120, "originalPrice": None, "stock": 15, "categoryId": cats["fresh-produce"]},
        {"name": "Coca-Cola 500ml", "description": "Chilled Coca-Cola soda, 500ml bottle.", "price": 70, "originalPrice": 90, "stock": 36, "categoryId": cats["drinks"]},
        {"name": "Ilara Fresh Milk 500ml", "description": "Pasteurised fresh milk, 500ml packet.", "price": 60, "originalPrice": None, "stock": 40, "categoryId": cats["drinks"]},
        {"name": "Supaloaf Bread 400g", "description": "Fresh sliced bread, baked today.", "price": 65, "originalPrice": 80, "stock": 20, "categoryId": cats["bakery"]},
        {"name": "Omo Detergent 1kg", "description": "Hand-wash washing powder, 1kg.", "price": 240, "originalPrice": None, "stock": 16, "categoryId": cats["household"]},
        {"name": "Geisha Soap 800g", "description": "Toilet soap, family bar 800g.", "price": 180, "originalPrice": 210, "stock": 18, "categoryId": cats["personal-care"]},
    ]

    ok = 0
    for p in products:
        body = json.dumps(p).encode()
        req = urllib.request.Request(
            f"{BASE}/api/vendor/products",
            data=body,
            method="POST",
            headers={"Content-Type": "application/json", "Cookie": f"hc_session={cookie_value}"},
        )
        try:
            with urllib.request.urlopen(req) as r:
                data = json.loads(r.read())
                print(f"  OK: {p['name']} (KSh {p['price']})")
                ok += 1
        except Exception as e:
            print(f"  FAIL: {p['name']}: {e}")
    print(f"\nAdded {ok}/{len(products)} products.")

if __name__ == "__main__":
    main()
