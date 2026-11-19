#!/usr/bin/env python3
"""Add source shops + products for the operator via the HustleCart API."""
import json
import urllib.request

BASE = "http://localhost:81"

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

def main():
    cookie = get_cookie()
    if not cookie:
        print("No cookie. Sign up first.")
        return

    # Create source shops
    shops_to_create = [
        {"name": "Kesses Market Stalls", "description": "The main open-air market at Kesses — fresh produce, groceries, household.", "location": "Kesses Market", "phone": None},
        {"name": "Cheptiret Mini Market", "description": "Indoor mini market at Cheptiret Centre — groceries and drinks.", "location": "Cheptiret Centre", "phone": None},
        {"name": "Tulwet General Shop", "description": "General shop at Tulwet Trading Centre — household + personal care.", "location": "Tulwet Trading Centre", "phone": None},
    ]
    shop_ids = {}
    for s in shops_to_create:
        r = api("/api/operator/shops", "POST", s, cookie)
        shop_ids[s["name"]] = r["shop"]["id"]
        print(f"Shop: {s['name']} -> {r['shop']['id']}")

    # Get categories
    cats = api("/api/categories", cookie=cookie)["categories"]
    cat_by_slug = {c["slug"]: c["id"] for c in cats}

    # Add products: name, description, sourceShop, category, costPrice, price, originalPrice, stock
    products = [
        {"name": "Joggo Maize Meal 1kg", "description": "Stone-ground maize flour, perfect for ugali. 1kg pack.", "shopId": shop_ids["Kesses Market Stalls"], "categoryId": cat_by_slug["groceries"], "costPrice": 160, "price": 180, "originalPrice": 220, "stock": 40},
        {"name": "Mumias White Sugar 1kg", "description": "Refined white sugar, 1kg pack.", "shopId": shop_ids["Kesses Market Stalls"], "categoryId": cat_by_slug["groceries"], "costPrice": 150, "price": 165, "originalPrice": None, "stock": 30},
        {"name": "Flynn Cooking Oil 1L", "description": "Refined vegetable cooking oil, 1 litre.", "shopId": shop_ids["Kesses Market Stalls"], "categoryId": cat_by_slug["groceries"], "costPrice": 350, "price": 380, "originalPrice": 450, "stock": 18},
        {"name": "Sukuma Wiki (Bunch)", "description": "Fresh kales bunch, harvested this morning.", "shopId": shop_ids["Kesses Market Stalls"], "categoryId": cat_by_slug["fresh-produce"], "costPrice": 25, "price": 30, "originalPrice": None, "stock": 35},
        {"name": "Tomatoes 1kg", "description": "Ripe red tomatoes, 1kg net.", "shopId": shop_ids["Kesses Market Stalls"], "categoryId": cat_by_slug["fresh-produce"], "costPrice": 70, "price": 90, "originalPrice": 120, "stock": 24},
        {"name": "Coca-Cola 500ml", "description": "Chilled Coca-Cola soda, 500ml bottle.", "shopId": shop_ids["Cheptiret Mini Market"], "categoryId": cat_by_slug["drinks"], "costPrice": 55, "price": 70, "originalPrice": 90, "stock": 36},
        {"name": "Ilara Fresh Milk 500ml", "description": "Pasteurised fresh milk, 500ml packet.", "shopId": shop_ids["Cheptiret Mini Market"], "categoryId": cat_by_slug["drinks"], "costPrice": 50, "price": 60, "originalPrice": None, "stock": 40},
        {"name": "Supaloaf Bread 400g", "description": "Fresh sliced bread, baked today.", "shopId": shop_ids["Cheptiret Mini Market"], "categoryId": cat_by_slug["bakery"], "costPrice": 55, "price": 65, "originalPrice": 80, "stock": 20},
        {"name": "Omo Detergent 1kg", "description": "Hand-wash washing powder, 1kg.", "shopId": shop_ids["Tulwet General Shop"], "categoryId": cat_by_slug["household"], "costPrice": 220, "price": 240, "originalPrice": None, "stock": 16},
        {"name": "Geisha Soap 800g", "description": "Toilet soap, family bar 800g.", "shopId": shop_ids["Tulwet General Shop"], "categoryId": cat_by_slug["personal-care"], "costPrice": 165, "price": 180, "originalPrice": 210, "stock": 18},
        {"name": "Rosy Toilet Paper 4 rolls", "description": "Soft 2-ply toilet tissue, pack of 4 rolls.", "shopId": shop_ids["Tulwet General Shop"], "categoryId": cat_by_slug["household"], "costPrice": 200, "price": 220, "originalPrice": None, "stock": 25},
        {"name": "Bingo Wafers 24g", "description": "Chocolate-flavoured wafers, snack pack.", "shopId": shop_ids["Tulwet General Shop"], "categoryId": cat_by_slug["snacks"], "costPrice": 20, "price": 25, "originalPrice": None, "stock": 80},
    ]
    for p in products:
        body = {**p, "originalPrice": p["originalPrice"]}  # already correct shape
        r = api("/api/operator/products", "POST", body, cookie)
        print(f"  Product: {p['name']} cost={p['costPrice']} sell={p['price']} shop={p['shopId'][:8]}")
    print(f"\nAdded {len(products)} products.")

if __name__ == "__main__":
    main()
