import type React from "react";
import {
  Salad, Sandwich, UtensilsCrossed, Popcorn,
  Coffee, Sparkles, IceCreamCone, Cake, CupSoda,
  Milk, Leaf, Blend, GlassWater
} from "lucide-react";


export interface MenuItem {
  name: string;
  description?: string;
  price?: number;
  dietary?: ("VG" | "V" | "GF")[];
}

interface MenuSubSection {
  subheading?: string;
  items: MenuItem[];
}

interface MenuCategory {
  id: string;
  label: string;
  icon: React.ElementType;
  sections: MenuSubSection[];
  note?: string;
}

export const menuCategories: MenuCategory[] = [
  {
    id: "breakfast",
    label: "all day breakfast",
    icon: Coffee,
    sections: [{
      items: [
        { name: "banana cinnamon oats", description: "warm oats with banana and cinnamon" },
        { name: "chia bowl with fruits & nuts", description: "chia pudding with fresh toppings" },
        { name: "pancakes with fruits", description: "fluffy pancakes with fresh fruits" },
        { name: "strawberry nutella crêpe", description: "sweet crêpe with strawberry and nutella" },
        { name: "spinach & ricotta crêpe", description: "savoury crêpe with creamy filling" },
        { name: "mushroom cream crêpe", description: "rich mushroom and cream filling" },
        { name: "avocado on toast", description: "smashed avocado on toasted bread" },
        { name: "tofu scramble on toast", description: "plant-based scrambled tofu on toast" },
        { name: "wild mushrooms on toast", description: "sautéed mushrooms on toast" },
        { name: "açaí bowl with fruits & nuts", description: "refreshing açaí with toppings" },
        { name: "strawberry oreo mini pancakes", description: "mini pancakes with oreo and strawberry" },
        { name: "butter croissant", description: "fresh, flaky classic" },
      ],
    }],
  },
  {
    id: "salads",
    label: "salads",
    icon: Salad,
    sections: [{
      items: [
        { name: "beetroot & strawberry salad", description: "fresh beetroot with sweet strawberry" },
        { name: "quinoa edamame salad", description: "protein-rich quinoa and edamame" },
        { name: "pasta salad", description: "light pasta with fresh vegetables" },
        { name: "greek salad", description: "feta, olives, and fresh vegetables" },
        { name: "caesar salad", description: "crisp lettuce with creamy dressing" },
        { name: "mixed bean salad", description: "hearty mixed beans and herbs" },
        { name: "sweet potato salad", description: "roasted sweet potato and greens" },
        { name: "super food salad", description: "nutrient-packed healthy mix" },
      ],
    }],
  },
  {
    id: "sandwiches",
    label: "sandwiches & wraps",
    icon: Sandwich,
    sections: [{
      items: [
        { name: "pesto caprese panini", description: "mozzarella, tomato, and pesto" },
        { name: "cheese grilled panini", description: "melted cheese in toasted bread" },
        { name: "the bombay special", description: "spiced indian-style sandwich" },
        { name: "grilled veggies panini", description: "roasted vegetables in panini" },
        { name: "avocado halloumi wrap", description: "creamy avocado with grilled halloumi" },
        { name: "garden veggie wrap", description: "fresh vegetables in soft wrap" },
        { name: "teriyaki paneer wrap", description: "paneer with sweet teriyaki glaze" },
      ],
    }],
    note: "all wraps served with potato wedges",
  },
  {
    id: "mains",
    label: "mains",
    icon: UtensilsCrossed,
    sections: [{
      items: [
        { name: "margherita pizza", description: "classic tomato and mozzarella" },
        { name: "penne arrabiata", description: "spicy tomato sauce pasta" },
        { name: "spaghetti aglio e olio", description: "garlic and olive oil spaghetti" },
        { name: "pesto pasta", description: "fresh basil pesto with pasta" },
      ],
    }],
  },
  {
    id: "starters",
    label: "starters & sides",
    icon: Popcorn,
    sections: [{
      items: [
        { name: "spicy salted edamame", description: "steamed with chilli salt" },
        { name: "nachos", description: "loaded with salsa and cheese" },
        { name: "roasted potato wedges", description: "crispy seasoned wedges" },
        { name: "french fries", description: "golden and crispy" },
        { name: "garlic mozzarella bread", description: "cheesy garlic flatbread" },
        { name: "butter popcorn", description: "classic buttery crunch" },
        { name: "cheese popcorn", description: "cheesy flavoured popcorn" },
      ],
    }],
  },
  {
    id: "matcha",
    label: "matcha",
    icon: Sparkles,
    sections: [{
      items: [
        { name: "matcha latte", description: "smooth ceremonial grade matcha" },
        { name: "cloud matcha", description: "fluffy cloud-topped matcha" },
        { name: "iced matcha latte", description: "chilled matcha over ice" },
        { name: "mango matcha iced latte", description: "tropical mango with matcha" },
        { name: "strawberry matcha iced latte", description: "sweet strawberry meets matcha" },
      ],
    }],
  },
  {
    id: "iced-specialty",
    label: "iced & specialty coffee",
    icon: IceCreamCone,
    sections: [{
      items: [
        { name: "iced americano", description: "bold espresso over ice" },
        { name: "iced cappuccino", description: "frothy cappuccino chilled" },
        { name: "iced mocha", description: "chocolate espresso on ice" },
        { name: "iced latte", description: "smooth latte over ice" },
        { name: "iced spanish latte", description: "sweetened condensed milk latte" },
        { name: "coconut iced americano", description: "coconut-infused cold espresso" },
        { name: "iced vanilla latte", description: "vanilla bean iced latte" },
      ],
    }],
  },
  {
    id: "coffee",
    label: "coffee",
    icon: Coffee,
    sections: [{
      items: [
        { name: "espresso", description: "rich single shot" },
        { name: "americano", description: "smooth and bold" },
        { name: "macchiato", description: "espresso with a dash of milk" },
        { name: "cortado", description: "equal parts espresso and milk" },
        { name: "cappuccino", description: "frothy and creamy" },
        { name: "café latte", description: "smooth steamed milk espresso" },
        { name: "spanish latte", description: "sweetened condensed milk blend" },
        { name: "café mocha", description: "chocolate meets espresso" },
        { name: "flat white", description: "velvety microfoam espresso" },
        { name: "v60", description: "hand-poured filter coffee" },
        { name: "hot chocolate", description: "rich and warming" },
      ],
    }],
  },
  {
    id: "desserts",
    label: "desserts",
    icon: Cake,
    sections: [{
      items: [
        { name: "double chocolate cookie", description: "soft cookie with chocolate chunks" },
        { name: "chocolate fudge cup", description: "rich chocolate dessert" },
        { name: "banana walnut choco slice", description: "moist banana chocolate cake" },
        { name: "marble cake slice", description: "vanilla and chocolate swirl" },
        { name: "chocolate cake", description: "classic rich chocolate cake" },
        { name: "classic tiramisu", description: "italian coffee dessert" },
        { name: "oreo cheesecake", description: "cookies and cream cheesecake" },
        { name: "very berry cheesecake", description: "mixed berry topped cheesecake" },
        { name: "lotus cheesecake", description: "biscoff caramel cheesecake" },
        { name: "affogato", description: "espresso over vanilla ice cream" },
        { name: "vanilla ice cream", description: "classic creamy scoop" },
        { name: "double chocolate ice cream", description: "indulgent chocolate scoop" },
      ],
    }],
  },
  {
    id: "shakes",
    label: "milkshakes & protein",
    icon: Milk,
    sections: [{
      items: [
        { name: "coffee date vanilla protein", description: "protein shake with coffee and dates" },
        { name: "strawberry vanilla protein", description: "fruity protein blend" },
        { name: "banana peanut butter protein", description: "creamy and rich" },
        { name: "double chocolate shake", description: "thick chocolate milkshake" },
        { name: "fresh strawberry shake", description: "blended fresh strawberries" },
        { name: "banana cream shake", description: "smooth banana and cream" },
      ],
    }],
  },
  {
    id: "teas",
    label: "teas",
    icon: Leaf,
    sections: [
      {
        items: [
          { name: "masala chai", description: "spiced indian tea blend" },
          { name: "saffron chai", description: "aromatic saffron-infused chai" },
          { name: "ginger cinnamon honey", description: "warming spiced herbal tea" },
          { name: "peach paradise", description: "sweet peach-infused tea" },
          { name: "singapore surprise", description: "tropical spiced tea blend" },
          { name: "royal earl grey", description: "classic bergamot black tea" },
        ],
      },
      {
        subheading: "avantcha collection",
        items: [
          { name: "moroccan mint", description: "refreshing north african mint" },
          { name: "jasmine", description: "fragrant jasmine green tea" },
          { name: "green", description: "pure and delicate green tea" },
          { name: "chamomile", description: "calming floral herbal tea" },
        ],
      },
    ],
  },
  {
    id: "smoothies",
    label: "smoothies & frappes",
    icon: Blend,
    sections: [{
      items: [
        { name: "blue tilebreaker", description: "blue spirulina, mango, banana, raspberry, coconut" },
        { name: "berry mania", description: "raspberry, blueberry, banana" },
        { name: "tropical fruits", description: "mango, passion fruit, pineapple" },
        { name: "charcoal magic", description: "blackcurrant, cherry, blueberry, blackberry, activated charcoal" },
        { name: "detox green", description: "broccoli, spinach, celery, mango, banana, pineapple" },
        { name: "matcha glow", description: "matcha, banana, mango, kale, coconut" },
        { name: "icy matcha frappe", description: "matcha, vanilla ice cream" },
        { name: "iced mocha frappe", description: "espresso, chocolate, ice cream" },
        { name: "caramel coffee frappe", description: "cold brew coffee, caramel, vanilla, ice cream" },
        { name: "matcha vanilla frappe", description: "matcha blended with vanilla cream" },
        { name: "tile cold coffee", description: "signature cold brew blend" },
      ],
    }],
  },
  {
    id: "refreshers",
    label: "refreshers & juices",
    icon: GlassWater,
    sections: [{
      items: [
        { name: "house brewed iced tea", description: "freshly brewed and chilled" },
        { name: "classic mojito", description: "lime, mint, and soda" },
        { name: "strawberry mojito", description: "strawberry twist on a classic" },
        { name: "matcha mint mojito", description: "matcha with fresh mint" },
        { name: "lemon & mint juice", description: "zesty and refreshing" },
        { name: "orange juice", description: "freshly squeezed orange" },
        { name: "watermelon juice", description: "sweet and hydrating" },
        { name: "carrot juice", description: "fresh cold-pressed carrot" },
        { name: "fresh coconut water", description: "natural and refreshing" },
      ],
    }],
  },
];


export const sentenceCase = (text: string) => text.charAt(0).toUpperCase() + text.slice(1).replace(/\btile\b/g, "TILE");
export const hasPrice = (price?: number) => typeof price === "number" && Number.isFinite(price);
