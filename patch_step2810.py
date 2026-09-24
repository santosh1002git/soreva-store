import re
with open('app.js', 'r', encoding='utf-8') as f:
    js = f.read()

# I will just replace the HERO_SLIDES definition completely.
new_hero = '''let HERO_SLIDES = [
    {
        id: 1,
        tag: "01 / 08 • ROYAL CHOKER EDIT",
        headline: "Where Timeless <em>Brilliance</em> Thrives",
        subtitle: "Handcrafted with Austrian AAA+ Cubic Zirconia crystals and 18K gold micro-finish. Designed for regal celebrations.",
        image: "https://indian-jewellery.com/core/thumb_images/product_images/412512AQ10CV92119.jpg",
        name: "Traditional Royal CZ Choker",
        priceINR: 6599,
        finish: "18K Gold Plated",
        productId: "czm_41673"
    },
    {
        id: 2,
        tag: "02 / 08 • CELESTE DROPS EDIT",
        headline: "The Fiery <em>Brilliance</em> of Pure Light",
        subtitle: "Diamond-cut multi-faceted cascading teardrops in Rhodium Silver finish with fiery diamond dispersion.",
        image: "https://indian-jewellery.com/core/thumb_images/product_images/571196DN10CD75382.jpg",
        name: "Celeste Diamond-Cut Zircon Drops",
        priceINR: 2349,
        finish: "Rhodium Silver",
        productId: "czm_51860"
    },
    {
        id: 3,
        tag: "03 / 08 • BRIDAL EMPRESS EDIT",
        headline: "Grandeur Reimagined for <em>Every Queen</em>",
        subtitle: "An opulent heirloom statement choker layered with brilliant cut round and baguette stones.",
        image: "https://indian-jewellery.com/core/thumb_images/product_images/413800AQ10CV92120.jpg",
        name: "Grand Empress Bridal CZ Choker",
        priceINR: 6449,
        finish: "18K Gold Plated",
        productId: "czm_41674"
    },
    {
        id: 4,
        tag: "04 / 08 • SIGNATURE RINGS EDIT",
        headline: "Subtle Luxury at <em>Your Fingertips</em>",
        subtitle: "Crown-cut solitary center stone with micro-pave encrusted shoulders for effortless everyday glamour.",
        image: "https://indian-jewellery.com/core/thumb_images/product_images/56518NC12CI45512.jpg",
        name: "Brilliant Princess Solitaire Ring",
        priceINR: 1199,
        finish: "Rhodium Silver",
        productId: "czm_51132"
    },
    {
        id: 5,
        tag: "05 / 08 • WRISTWEAR ICON EDIT",
        headline: "Fluid Elegance Around <em>Your Wrist</em>",
        subtitle: "Continuous fire of handset round brilliant stones. Flexible, feather-light, and flawlessly secure.",
        image: "https://indian-jewellery.com/core/thumb_images/product_images/49938CP12CU68937.jpg",
        name: "Shagun Spark CZ Tennis Bracelet",
        priceINR: 2199,
        finish: "18K Gold Plated",
        productId: "czm_46519"
    },
    {
        id: 6,
        tag: "06 / 08 • HALO SOLITAIRE EDIT",
        headline: "Everyday Grace with <em>Luminous Depth</em>",
        subtitle: "Delicate floating solitaire pendant set in micro-halo setting on an adjustable fine chain.",
        image: "https://indian-jewellery.com/core/thumb_images/product_images/55252BF12CP10120.jpg",
        name: "Diamond Replica Halo Pendant",
        priceINR: 1199,
        finish: "18K Gold Plated",
        productId: "czm_50550"
    },
    {
        id: 7,
        tag: "07 / 08 • IMPERIAL JHUMKA EDIT",
        headline: "Heritage Craftsmanship <em>Modern Silhouette</em>",
        subtitle: "Filigree bells encrusted with pave crystals and delicate pearl drops for regal festive evenings.",
        image: "https://indian-jewellery.com/core/thumb_images/product_images/571230DN12CP75345.jpg",
        name: "Imperial Cascading CZ Drops",
        priceINR: 2349,
        finish: "18K Gold Plated",
        productId: "czm_51696"
    },
    {
        id: 8,
        tag: "08 / 08 • DULHAN SHINE EDIT",
        headline: "Radiance That Captures <em>Every Gaze</em>",
        subtitle: "Grand bridal combo wristwear set with hand-faceted cubic zirconia and safety clasp.",
        image: "https://indian-jewellery.com/core/thumb_images/product_images/49938CP12CU68939.jpg",
        name: "Dulhan Shine Bridal Bracelet",
        priceINR: 2599,
        finish: "18K Gold Plated",
        productId: "czm_46520"
    }
];'''

js = re.sub(r'const HERO_SLIDES = \[.*?\];', new_hero, js, flags=re.DOTALL)
js = re.sub(r'let HERO_SLIDES = \[.*?\];', new_hero, js, flags=re.DOTALL)

with open('app.js', 'w', encoding='utf-8') as f:
    f.write(js)
