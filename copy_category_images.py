import os
import shutil

src_dir = r"C:\Users\ANSH AGARWAL\.gemini\antigravity-ide\brain\85bdf3db-c1f5-4f8f-9bc7-b812da1c897a"
dest_dir = r"c:\Users\ANSH AGARWAL\Desktop\SHREE SAI JEWELLERS\images\categories"
os.makedirs(dest_dir, exist_ok=True)

mapping = {
    "rings.jpg": "category_rings_1788412075673.jpg",
    "necklaces.jpg": "category_necklaces_1788412097688.jpg",
    "earrings.jpg": "category_earrings_1788412136335.jpg",
    "bangles.jpg": "category_bangles_1788412164036.jpg",
    "bracelets.jpg": "category_bracelets_1788412214098.jpg",
    "chains.jpg": "category_chains_1788412273848.jpg"
}

for dest_name, src_name in mapping.items():
    s = os.path.join(src_dir, src_name)
    d = os.path.join(dest_dir, dest_name)
    if os.path.exists(s):
        shutil.copyfile(s, d)
        print(f"Copied {s} -> {d}")
    else:
        print(f"File not found: {s}")
