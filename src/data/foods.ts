import { INDB_FOODS } from './indbFoods';

export type FoodCategory =
  | 'Breakfast & Tiffin'
  | 'Rice & Meals'
  | 'Breads'
  | 'Curries & Sides'
  | 'Non-Veg'
  | 'Snacks & Chaat'
  | 'Sweets'
  | 'Drinks'
  | 'International'
  | 'Fruits & Nuts'
  | 'Basics'
  | 'More Dishes'
  | 'My Foods';

export type Food = {
  id: string;
  name: string;
  /** Other names people search for (Kannada/Tamil names, common spellings). */
  aliases?: string[];
  category: FoodCategory;
  /** What one serving looks like, e.g. "1 medium" or "1 katori". */
  serving: string;
  /** Weight of one serving, when known. */
  grams?: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  /** True for dishes imported from INDB that we haven't hand-checked. */
  approximate?: boolean;
};

// Approximate values per typical serving as eaten in Bangalore homes and restaurants.
// Cross-checked against INDB (Indian Nutrient Databank) and USDA FoodData Central where they
// have the dish; INDB's deep-fried items count all frying oil as eaten, so those are our own estimates.
export const FOODS: Food[] = [
  // Breakfast & Tiffin
  { id: 'idli', name: 'Idli', category: 'Breakfast & Tiffin', serving: '1 piece', grams: 40, kcal: 58, protein: 2, carbs: 12, fat: 0.2 },
  { id: 'thatte_idli', name: 'Thatte Idli', aliases: ['plate idli'], category: 'Breakfast & Tiffin', serving: '1 piece', grams: 100, kcal: 145, protein: 4, carbs: 30, fat: 0.5 },
  { id: 'rava_idli', name: 'Rava Idli', category: 'Breakfast & Tiffin', serving: '1 piece', grams: 60, kcal: 110, protein: 3, carbs: 15, fat: 4 },
  { id: 'plain_dosa', name: 'Plain Dosa', aliases: ['sada dosa'], category: 'Breakfast & Tiffin', serving: '1 medium', grams: 90, kcal: 160, protein: 4, carbs: 26, fat: 4.5 },
  { id: 'masala_dosa', name: 'Masala Dosa', category: 'Breakfast & Tiffin', serving: '1 medium', grams: 180, kcal: 330, protein: 7, carbs: 48, fat: 12 },
  { id: 'benne_masala_dosa', name: 'Benne Masala Dosa', aliases: ['butter masala dosa', 'davangere benne dosa'], category: 'Breakfast & Tiffin', serving: '1 dosa', grams: 200, kcal: 450, protein: 8, carbs: 52, fat: 22 },
  { id: 'set_dosa', name: 'Set Dosa', category: 'Breakfast & Tiffin', serving: '1 set (3 pcs)', grams: 150, kcal: 300, protein: 7, carbs: 50, fat: 8 },
  { id: 'rava_dosa', name: 'Rava Dosa', category: 'Breakfast & Tiffin', serving: '1 dosa', grams: 120, kcal: 230, protein: 4, carbs: 30, fat: 10 },
  { id: 'neer_dosa', name: 'Neer Dosa', category: 'Breakfast & Tiffin', serving: '1 piece', grams: 40, kcal: 65, protein: 1, carbs: 12, fat: 1.5 },
  { id: 'pesarattu', name: 'Pesarattu', aliases: ['moong dal dosa'], category: 'Breakfast & Tiffin', serving: '1 dosa', grams: 120, kcal: 200, protein: 9, carbs: 28, fat: 6 },
  { id: 'uttapam', name: 'Uttapam', aliases: ['uthappa', 'onion uttapam'], category: 'Breakfast & Tiffin', serving: '1 uttapam', grams: 150, kcal: 250, protein: 6, carbs: 40, fat: 7 },
  { id: 'medu_vada', name: 'Medu Vada', aliases: ['uddina vade', 'vada'], category: 'Breakfast & Tiffin', serving: '1 piece', grams: 45, kcal: 135, protein: 4, carbs: 13, fat: 7.5 },
  { id: 'masala_vada', name: 'Masala Vada', aliases: ['dal vada', 'ambode'], category: 'Breakfast & Tiffin', serving: '1 piece', grams: 40, kcal: 130, protein: 5, carbs: 12, fat: 7 },
  { id: 'khara_bath', name: 'Khara Bath', aliases: ['upma', 'uppittu'], category: 'Breakfast & Tiffin', serving: '1 plate', grams: 200, kcal: 280, protein: 6, carbs: 40, fat: 10 },
  { id: 'kesari_bath', name: 'Kesari Bath', aliases: ['sheera', 'rava kesari'], category: 'Breakfast & Tiffin', serving: '1 plate', grams: 150, kcal: 380, protein: 4, carbs: 55, fat: 16 },
  { id: 'chow_chow_bath', name: 'Chow Chow Bath', aliases: ['khara kesari'], category: 'Breakfast & Tiffin', serving: '1 plate (khara + kesari)', grams: 300, kcal: 600, protein: 10, carbs: 90, fat: 24 },
  { id: 'poha', name: 'Poha', aliases: ['avalakki', 'avalakki oggarane'], category: 'Breakfast & Tiffin', serving: '1 plate', grams: 180, kcal: 250, protein: 5, carbs: 40, fat: 8 },
  { id: 'ven_pongal', name: 'Ven Pongal', aliases: ['khara pongal', 'pongal'], category: 'Breakfast & Tiffin', serving: '1 plate', grams: 200, kcal: 280, protein: 8, carbs: 40, fat: 10 },
  { id: 'akki_roti', name: 'Akki Roti', category: 'Breakfast & Tiffin', serving: '1 roti', grams: 100, kcal: 220, protein: 4, carbs: 38, fat: 6 },
  { id: 'ragi_roti', name: 'Ragi Roti', category: 'Breakfast & Tiffin', serving: '1 roti', grams: 100, kcal: 210, protein: 5, carbs: 33, fat: 6 },
  { id: 'poori', name: 'Poori', aliases: ['puri'], category: 'Breakfast & Tiffin', serving: '1 piece', grams: 30, kcal: 100, protein: 2, carbs: 12, fat: 5 },
  { id: 'appam', name: 'Appam', aliases: ['palappam', 'hoppers'], category: 'Breakfast & Tiffin', serving: '1 piece', grams: 60, kcal: 120, protein: 2, carbs: 23, fat: 2 },
  { id: 'puttu', name: 'Puttu', category: 'Breakfast & Tiffin', serving: '1 piece', grams: 100, kcal: 170, protein: 3, carbs: 37, fat: 1 },
  { id: 'idiyappam', name: 'Idiyappam', aliases: ['string hoppers', 'shavige', 'nool puttu'], category: 'Breakfast & Tiffin', serving: '2 pieces', grams: 80, kcal: 140, protein: 2, carbs: 31, fat: 0.5 },
  { id: 'paniyaram', name: 'Paniyaram', aliases: ['guliyappa', 'paddu', 'appe', 'kuzhi paniyaram'], category: 'Breakfast & Tiffin', serving: '4 pieces', grams: 100, kcal: 200, protein: 4, carbs: 30, fat: 7 },
  { id: 'aloo_paratha', name: 'Aloo Paratha', category: 'Breakfast & Tiffin', serving: '1 paratha', grams: 120, kcal: 270, protein: 6, carbs: 38, fat: 11 },
  { id: 'bread_omelette', name: 'Bread Omelette', category: 'Breakfast & Tiffin', serving: '2 slices + 2 eggs', grams: 170, kcal: 340, protein: 17, carbs: 28, fat: 17 },
  { id: 'bread_butter', name: 'Bread Butter / Toast', aliases: ['toast', 'bread'], category: 'Breakfast & Tiffin', serving: '2 slices', grams: 70, kcal: 230, protein: 6, carbs: 30, fat: 9 },
  { id: 'veg_sandwich', name: 'Veg Sandwich', aliases: ['grilled sandwich', 'bombay sandwich'], category: 'Breakfast & Tiffin', serving: '1 sandwich', grams: 150, kcal: 300, protein: 8, carbs: 40, fat: 12 },
  { id: 'oats_milk', name: 'Oats with Milk', aliases: ['oatmeal', 'porridge'], category: 'Breakfast & Tiffin', serving: '1 bowl', grams: 250, kcal: 270, protein: 12, carbs: 35, fat: 9 },
  { id: 'cornflakes_milk', name: 'Cornflakes with Milk', aliases: ['cereal'], category: 'Breakfast & Tiffin', serving: '1 bowl', grams: 230, kcal: 230, protein: 8, carbs: 34, fat: 6 },

  // Rice & Meals
  { id: 'steamed_rice', name: 'Steamed Rice', aliases: ['white rice', 'anna'], category: 'Rice & Meals', serving: '1 cup cooked', grams: 150, kcal: 195, protein: 4, carbs: 43, fat: 0.4 },
  { id: 'ragi_mudde', name: 'Ragi Mudde', aliases: ['ragi ball', 'ragi kali'], category: 'Rice & Meals', serving: '1 ball', grams: 150, kcal: 210, protein: 5, carbs: 45, fat: 1 },
  { id: 'bisi_bele_bath', name: 'Bisi Bele Bath', aliases: ['bisibelebath'], category: 'Rice & Meals', serving: '1 plate', grams: 250, kcal: 380, protein: 10, carbs: 55, fat: 13 },
  { id: 'vangi_bath', name: 'Vangi Bath', aliases: ['brinjal rice'], category: 'Rice & Meals', serving: '1 plate', grams: 200, kcal: 320, protein: 6, carbs: 50, fat: 10 },
  { id: 'chitranna', name: 'Chitranna', aliases: ['lemon rice'], category: 'Rice & Meals', serving: '1 plate', grams: 200, kcal: 330, protein: 5, carbs: 55, fat: 10 },
  { id: 'puliyogare', name: 'Puliyogare', aliases: ['tamarind rice', 'puliyodharai'], category: 'Rice & Meals', serving: '1 plate', grams: 200, kcal: 350, protein: 6, carbs: 55, fat: 12 },
  { id: 'curd_rice', name: 'Curd Rice', aliases: ['mosaranna', 'thayir sadam'], category: 'Rice & Meals', serving: '1 plate', grams: 200, kcal: 300, protein: 8, carbs: 45, fat: 9 },
  { id: 'veg_biryani', name: 'Veg Biryani', category: 'Rice & Meals', serving: '1 plate', grams: 300, kcal: 420, protein: 9, carbs: 65, fat: 14 },
  { id: 'khichdi', name: 'Khichdi', category: 'Rice & Meals', serving: '1 plate', grams: 250, kcal: 300, protein: 10, carbs: 48, fat: 8 },
  { id: 'rajma_chawal', name: 'Rajma Chawal', category: 'Rice & Meals', serving: '1 plate', grams: 350, kcal: 450, protein: 15, carbs: 80, fat: 8 },
  { id: 'jeera_rice', name: 'Jeera Rice', category: 'Rice & Meals', serving: '1 cup', grams: 150, kcal: 240, protein: 4, carbs: 42, fat: 6 },
  { id: 'veg_pulao', name: 'Veg Pulao', aliases: ['pulav', 'pilaf'], category: 'Rice & Meals', serving: '1 plate', grams: 200, kcal: 270, protein: 6, carbs: 45, fat: 8 },
  { id: 'veg_fried_rice', name: 'Veg Fried Rice', aliases: ['fried rice'], category: 'Rice & Meals', serving: '1 plate', grams: 250, kcal: 350, protein: 7, carbs: 58, fat: 10 },
  { id: 'egg_fried_rice', name: 'Egg Fried Rice', category: 'Rice & Meals', serving: '1 plate', grams: 250, kcal: 450, protein: 13, carbs: 62, fat: 16 },
  { id: 'south_indian_meals', name: 'South Indian Meals', aliases: ['meals', 'oota', 'banana leaf meals', 'full meals'], category: 'Rice & Meals', serving: '1 full plate', grams: 700, kcal: 750, protein: 20, carbs: 130, fat: 18 },
  { id: 'veg_thali', name: 'North Indian Veg Thali', aliases: ['thali'], category: 'Rice & Meals', serving: '1 thali', grams: 650, kcal: 800, protein: 25, carbs: 110, fat: 28 },

  // Breads
  { id: 'chapati', name: 'Chapati', aliases: ['roti', 'phulka'], category: 'Breads', serving: '1 medium', grams: 40, kcal: 120, protein: 3, carbs: 18, fat: 3.5 },
  { id: 'parotta', name: 'Parotta', aliases: ['kerala parotta', 'porotta'], category: 'Breads', serving: '1 piece', grams: 80, kcal: 280, protein: 5, carbs: 38, fat: 12 },
  { id: 'butter_naan', name: 'Butter Naan', aliases: ['naan'], category: 'Breads', serving: '1 piece', grams: 90, kcal: 300, protein: 8, carbs: 45, fat: 10 },
  { id: 'pav', name: 'Pav', category: 'Breads', serving: '1 bun', grams: 40, kcal: 110, protein: 3.5, carbs: 20, fat: 1.5 },
  { id: 'plain_paratha', name: 'Plain Paratha', aliases: ['paratha', 'lachha paratha'], category: 'Breads', serving: '1 paratha', grams: 80, kcal: 240, protein: 5, carbs: 33, fat: 10 },
  { id: 'tandoori_roti', name: 'Tandoori Roti', category: 'Breads', serving: '1 roti', grams: 60, kcal: 160, protein: 5, carbs: 32, fat: 1.5 },
  { id: 'thepla', name: 'Thepla', aliases: ['methi thepla'], category: 'Breads', serving: '1 piece', grams: 40, kcal: 120, protein: 3, carbs: 16, fat: 5 },

  // Curries & Sides
  { id: 'sambar', name: 'Sambar', aliases: ['huli', 'saaru'], category: 'Curries & Sides', serving: '1 katori', grams: 150, kcal: 130, protein: 5, carbs: 16, fat: 5 },
  { id: 'rasam', name: 'Rasam', aliases: ['tili saaru'], category: 'Curries & Sides', serving: '1 katori', grams: 150, kcal: 50, protein: 1.5, carbs: 7, fat: 2 },
  { id: 'coconut_chutney', name: 'Coconut Chutney', aliases: ['chutney', 'kayi chutney'], category: 'Curries & Sides', serving: '2 tbsp', grams: 30, kcal: 70, protein: 1, carbs: 3, fat: 6.5 },
  { id: 'dal', name: 'Dal', aliases: ['dal tadka', 'tovve', 'paruppu'], category: 'Curries & Sides', serving: '1 katori', grams: 150, kcal: 170, protein: 8, carbs: 20, fat: 6 },
  { id: 'palya', name: 'Vegetable Palya', aliases: ['poriyal', 'sabzi', 'stir fry'], category: 'Curries & Sides', serving: '1 katori', grams: 100, kcal: 100, protein: 3, carbs: 10, fat: 6 },
  { id: 'sagu', name: 'Sagu', aliases: ['veg kurma', 'korma'], category: 'Curries & Sides', serving: '1 katori', grams: 150, kcal: 150, protein: 3, carbs: 15, fat: 9 },
  { id: 'chole', name: 'Chole', aliases: ['chana masala'], category: 'Curries & Sides', serving: '1 katori', grams: 150, kcal: 210, protein: 9, carbs: 27, fat: 7 },
  { id: 'paneer_butter_masala', name: 'Paneer Butter Masala', category: 'Curries & Sides', serving: '1 katori', grams: 150, kcal: 350, protein: 12, carbs: 12, fat: 28 },
  { id: 'curd', name: 'Curd', aliases: ['mosaru', 'dahi', 'yogurt'], category: 'Curries & Sides', serving: '1 katori', grams: 100, kcal: 65, protein: 3.5, carbs: 4.5, fat: 4 },
  { id: 'rajma', name: 'Rajma', aliases: ['kidney beans curry'], category: 'Curries & Sides', serving: '1 katori', grams: 150, kcal: 180, protein: 9, carbs: 25, fat: 5 },
  { id: 'dal_makhani', name: 'Dal Makhani', category: 'Curries & Sides', serving: '1 katori', grams: 150, kcal: 220, protein: 8, carbs: 20, fat: 12 },
  { id: 'palak_paneer', name: 'Palak Paneer', category: 'Curries & Sides', serving: '1 katori', grams: 150, kcal: 220, protein: 11, carbs: 8, fat: 16 },
  { id: 'matar_paneer', name: 'Matar Paneer', aliases: ['mutter paneer'], category: 'Curries & Sides', serving: '1 katori', grams: 150, kcal: 250, protein: 11, carbs: 14, fat: 17 },
  { id: 'kadai_paneer', name: 'Kadai Paneer', category: 'Curries & Sides', serving: '1 katori', grams: 150, kcal: 280, protein: 13, carbs: 10, fat: 21 },
  { id: 'paneer_tikka', name: 'Paneer Tikka', category: 'Curries & Sides', serving: '6 pieces', grams: 150, kcal: 330, protein: 20, carbs: 8, fat: 24 },
  { id: 'aloo_gobi', name: 'Aloo Gobi', category: 'Curries & Sides', serving: '1 katori', grams: 150, kcal: 150, protein: 4, carbs: 18, fat: 8 },
  { id: 'bhindi_masala', name: 'Bhindi Masala', aliases: ['bhindi fry', 'okra', 'bendekai palya'], category: 'Curries & Sides', serving: '1 katori', grams: 120, kcal: 140, protein: 3, carbs: 12, fat: 9 },
  { id: 'aloo_sabzi', name: 'Aloo Sabzi', aliases: ['potato curry', 'aloo curry', 'batata palya'], category: 'Curries & Sides', serving: '1 katori', grams: 150, kcal: 170, protein: 3, carbs: 22, fat: 8 },
  { id: 'baingan_bharta', name: 'Baingan Bharta', category: 'Curries & Sides', serving: '1 katori', grams: 150, kcal: 140, protein: 3, carbs: 12, fat: 9 },
  { id: 'mix_veg', name: 'Mixed Veg Curry', aliases: ['mix veg', 'sabzi'], category: 'Curries & Sides', serving: '1 katori', grams: 150, kcal: 150, protein: 4, carbs: 14, fat: 9 },
  { id: 'kadhi', name: 'Kadhi', aliases: ['kadhi pakora', 'majjige huli', 'mor kuzhambu'], category: 'Curries & Sides', serving: '1 katori', grams: 150, kcal: 140, protein: 5, carbs: 12, fat: 8 },
  { id: 'avial', name: 'Avial', category: 'Curries & Sides', serving: '1 katori', grams: 150, kcal: 160, protein: 4, carbs: 12, fat: 11 },
  { id: 'raita', name: 'Raita', aliases: ['pachadi', 'mosaru bajji'], category: 'Curries & Sides', serving: '1 katori', grams: 100, kcal: 70, protein: 3, carbs: 6, fat: 3.5 },
  { id: 'papad', name: 'Papad (roasted)', aliases: ['papadum', 'happala', 'appalam'], category: 'Curries & Sides', serving: '1 piece', grams: 15, kcal: 50, protein: 3, carbs: 9, fat: 0.5 },
  { id: 'green_salad', name: 'Green Salad', aliases: ['salad', 'kosambari'], category: 'Curries & Sides', serving: '1 katori', grams: 100, kcal: 25, protein: 1, carbs: 5, fat: 0.2 },

  // Non-Veg
  { id: 'chicken_biryani', name: 'Chicken Biryani', category: 'Non-Veg', serving: '1 plate', grams: 300, kcal: 520, protein: 25, carbs: 60, fat: 20 },
  { id: 'donne_biryani', name: 'Donne Biryani (Chicken)', aliases: ['military hotel biryani'], category: 'Non-Veg', serving: '1 donne', grams: 350, kcal: 600, protein: 28, carbs: 70, fat: 22 },
  { id: 'mutton_biryani', name: 'Mutton Biryani', category: 'Non-Veg', serving: '1 plate', grams: 300, kcal: 600, protein: 25, carbs: 60, fat: 28 },
  { id: 'chicken_curry', name: 'Chicken Curry', aliases: ['chicken saaru'], category: 'Non-Veg', serving: '1 katori', grams: 150, kcal: 240, protein: 20, carbs: 6, fat: 15 },
  { id: 'chicken_kebab', name: 'Chicken Kebab', aliases: ['kabab'], category: 'Non-Veg', serving: '100 g', grams: 100, kcal: 250, protein: 22, carbs: 8, fat: 15 },
  { id: 'fish_fry', name: 'Fish Fry', category: 'Non-Veg', serving: '1 piece', grams: 100, kcal: 220, protein: 20, carbs: 6, fat: 13 },
  { id: 'egg_curry', name: 'Egg Curry', category: 'Non-Veg', serving: '1 katori (2 eggs)', grams: 200, kcal: 280, protein: 14, carbs: 8, fat: 21 },
  { id: 'boiled_egg', name: 'Boiled Egg', aliases: ['egg'], category: 'Non-Veg', serving: '1 egg', grams: 50, kcal: 72, protein: 6.3, carbs: 0.4, fat: 4.8 },
  { id: 'omelette', name: 'Omelette', category: 'Non-Veg', serving: '2 eggs', grams: 120, kcal: 190, protein: 13, carbs: 1, fat: 15 },
  { id: 'egg_bhurji', name: 'Egg Bhurji', aliases: ['scrambled eggs', 'anda bhurji'], category: 'Non-Veg', serving: '2 eggs', grams: 130, kcal: 220, protein: 13, carbs: 4, fat: 17 },
  { id: 'butter_chicken', name: 'Butter Chicken', aliases: ['murgh makhani'], category: 'Non-Veg', serving: '1 katori', grams: 150, kcal: 300, protein: 20, carbs: 9, fat: 21 },
  { id: 'chicken_tikka', name: 'Chicken Tikka', category: 'Non-Veg', serving: '6 pieces', grams: 150, kcal: 250, protein: 35, carbs: 5, fat: 10 },
  { id: 'tandoori_chicken', name: 'Tandoori Chicken', category: 'Non-Veg', serving: '1 quarter (leg)', grams: 150, kcal: 250, protein: 33, carbs: 4, fat: 11 },
  { id: 'chicken_65', name: 'Chicken 65', aliases: ['chicken kabab dry', 'chicken fry'], category: 'Non-Veg', serving: '1 plate', grams: 150, kcal: 380, protein: 25, carbs: 15, fat: 25 },
  { id: 'mutton_curry', name: 'Mutton Curry', aliases: ['mutton saaru', 'mutton gravy'], category: 'Non-Veg', serving: '1 katori', grams: 150, kcal: 300, protein: 22, carbs: 6, fat: 21 },
  { id: 'keema', name: 'Keema', aliases: ['kheema', 'mince curry'], category: 'Non-Veg', serving: '1 katori', grams: 150, kcal: 320, protein: 22, carbs: 8, fat: 22 },
  { id: 'fish_curry', name: 'Fish Curry', aliases: ['meen curry', 'fish gravy'], category: 'Non-Veg', serving: '1 katori (1 piece)', grams: 150, kcal: 190, protein: 19, carbs: 6, fat: 10 },

  // Snacks & Chaat
  { id: 'mysore_bonda', name: 'Mysore Bonda', aliases: ['bonda'], category: 'Snacks & Chaat', serving: '1 piece', grams: 40, kcal: 120, protein: 2, carbs: 14, fat: 6 },
  { id: 'mirchi_bajji', name: 'Mirchi Bajji', aliases: ['bajji', 'menasinakai bajji'], category: 'Snacks & Chaat', serving: '1 piece', grams: 50, kcal: 120, protein: 2, carbs: 10, fat: 8 },
  { id: 'samosa', name: 'Samosa', category: 'Snacks & Chaat', serving: '1 piece', grams: 80, kcal: 260, protein: 4, carbs: 28, fat: 15 },
  { id: 'gobi_manchurian', name: 'Gobi Manchurian', aliases: ['gobi'], category: 'Snacks & Chaat', serving: '1 plate', grams: 150, kcal: 300, protein: 5, carbs: 30, fat: 18 },
  { id: 'pav_bhaji', name: 'Pav Bhaji', category: 'Snacks & Chaat', serving: '1 plate (2 pav)', grams: 300, kcal: 450, protein: 10, carbs: 60, fat: 18 },
  { id: 'chole_bhature', name: 'Chole Bhature', category: 'Snacks & Chaat', serving: '1 plate (2 bhature)', grams: 350, kcal: 650, protein: 18, carbs: 80, fat: 30 },
  { id: 'masala_puri', name: 'Masala Puri', category: 'Snacks & Chaat', serving: '1 plate', grams: 200, kcal: 330, protein: 8, carbs: 45, fat: 13 },
  { id: 'pani_puri', name: 'Pani Puri', aliases: ['gol gappa'], category: 'Snacks & Chaat', serving: '1 plate (6 pcs)', grams: 150, kcal: 220, protein: 4, carbs: 35, fat: 7 },
  { id: 'vada_pav', name: 'Vada Pav', category: 'Snacks & Chaat', serving: '1 piece', grams: 130, kcal: 290, protein: 6, carbs: 40, fat: 12 },
  { id: 'misal_pav', name: 'Misal Pav', category: 'Snacks & Chaat', serving: '1 plate (2 pav)', grams: 350, kcal: 520, protein: 18, carbs: 65, fat: 20 },
  { id: 'dhokla', name: 'Dhokla', aliases: ['khaman'], category: 'Snacks & Chaat', serving: '4 pieces', grams: 120, kcal: 200, protein: 8, carbs: 28, fat: 6 },
  { id: 'bhel_puri', name: 'Bhel Puri', aliases: ['churmuri', 'bhel'], category: 'Snacks & Chaat', serving: '1 plate', grams: 150, kcal: 250, protein: 5, carbs: 40, fat: 8 },
  { id: 'sev_puri', name: 'Sev Puri', aliases: ['dahi puri'], category: 'Snacks & Chaat', serving: '1 plate (6 pcs)', grams: 120, kcal: 290, protein: 5, carbs: 35, fat: 14 },
  { id: 'dabeli', name: 'Dabeli', category: 'Snacks & Chaat', serving: '1 piece', grams: 130, kcal: 300, protein: 6, carbs: 42, fat: 12 },
  { id: 'kachori', name: 'Kachori', category: 'Snacks & Chaat', serving: '1 piece', grams: 60, kcal: 230, protein: 4, carbs: 22, fat: 14 },
  { id: 'onion_pakoda', name: 'Onion Pakoda', aliases: ['pakora', 'pakoda', 'eerulli pakoda', 'bhajiya'], category: 'Snacks & Chaat', serving: '1 plate', grams: 100, kcal: 300, protein: 6, carbs: 28, fat: 18 },
  { id: 'aloo_tikki', name: 'Aloo Tikki', aliases: ['potato cutlet', 'cutlet'], category: 'Snacks & Chaat', serving: '2 pieces', grams: 120, kcal: 260, protein: 4, carbs: 32, fat: 13 },
  { id: 'kathi_roll', name: 'Chicken Kathi Roll', aliases: ['kati roll', 'roll', 'frankie'], category: 'Snacks & Chaat', serving: '1 roll', grams: 200, kcal: 450, protein: 22, carbs: 45, fat: 20 },
  { id: 'veg_momos', name: 'Veg Momos (steamed)', aliases: ['momos', 'dumplings'], category: 'Snacks & Chaat', serving: '6 pieces', grams: 150, kcal: 240, protein: 7, carbs: 38, fat: 6 },
  { id: 'chicken_momos', name: 'Chicken Momos (steamed)', category: 'Snacks & Chaat', serving: '6 pieces', grams: 150, kcal: 290, protein: 15, carbs: 34, fat: 10 },
  { id: 'maggi', name: 'Maggi Noodles', aliases: ['instant noodles', 'noodles'], category: 'Snacks & Chaat', serving: '1 pack (70 g)', grams: 70, kcal: 310, protein: 7, carbs: 43, fat: 12 },

  // Sweets
  { id: 'mysore_pak', name: 'Mysore Pak', category: 'Sweets', serving: '1 piece', grams: 30, kcal: 165, protein: 1.5, carbs: 14, fat: 11 },
  { id: 'gulab_jamun', name: 'Gulab Jamun', category: 'Sweets', serving: '1 piece', grams: 40, kcal: 150, protein: 2, carbs: 22, fat: 6 },
  { id: 'obbattu', name: 'Obbattu', aliases: ['holige', 'puran poli'], category: 'Sweets', serving: '1 piece', grams: 80, kcal: 270, protein: 5, carbs: 45, fat: 8 },
  { id: 'payasa', name: 'Payasa', aliases: ['kheer', 'payasam'], category: 'Sweets', serving: '1 katori', grams: 150, kcal: 250, protein: 6, carbs: 38, fat: 8 },
  { id: 'jalebi', name: 'Jalebi', category: 'Sweets', serving: '2 pieces', grams: 50, kcal: 200, protein: 1, carbs: 30, fat: 8 },
  { id: 'rasgulla', name: 'Rasgulla', aliases: ['rosogolla'], category: 'Sweets', serving: '1 piece', grams: 50, kcal: 95, protein: 2, carbs: 20, fat: 1 },
  { id: 'rasmalai', name: 'Rasmalai', category: 'Sweets', serving: '1 piece', grams: 60, kcal: 140, protein: 5, carbs: 18, fat: 6 },
  { id: 'besan_ladoo', name: 'Besan Ladoo', aliases: ['laddu', 'ladoo'], category: 'Sweets', serving: '1 piece', grams: 40, kcal: 190, protein: 3, carbs: 20, fat: 11 },
  { id: 'boondi_ladoo', name: 'Boondi Ladoo', aliases: ['motichoor ladoo'], category: 'Sweets', serving: '1 piece', grams: 40, kcal: 180, protein: 2, carbs: 25, fat: 8 },
  { id: 'kaju_katli', name: 'Kaju Katli', aliases: ['kaju barfi'], category: 'Sweets', serving: '1 piece', grams: 15, kcal: 70, protein: 1.5, carbs: 8, fat: 3.5 },
  { id: 'gajar_halwa', name: 'Gajar Halwa', aliases: ['carrot halwa'], category: 'Sweets', serving: '1 katori', grams: 100, kcal: 250, protein: 5, carbs: 30, fat: 13 },
  { id: 'kulfi', name: 'Kulfi', aliases: ['ice cream'], category: 'Sweets', serving: '1 stick', grams: 60, kcal: 150, protein: 4, carbs: 16, fat: 8 },
  { id: 'peda', name: 'Peda', aliases: ['pedha', 'doodh peda', 'kesar peda'], category: 'Sweets', serving: '1 piece', grams: 25, kcal: 100, protein: 2, carbs: 14, fat: 4 },
  { id: 'barfi', name: 'Barfi', aliases: ['burfi', 'milk barfi'], category: 'Sweets', serving: '1 piece', grams: 30, kcal: 130, protein: 3, carbs: 16, fat: 6 },
  { id: 'coconut_barfi', name: 'Coconut Barfi', aliases: ['kobbari mithai', 'nariyal barfi'], category: 'Sweets', serving: '1 piece', grams: 30, kcal: 130, protein: 1, carbs: 16, fat: 7 },
  { id: 'kalakand', name: 'Kalakand', category: 'Sweets', serving: '1 piece', grams: 40, kcal: 160, protein: 5, carbs: 18, fat: 8 },
  { id: 'sandesh', name: 'Sandesh', aliases: ['sondesh'], category: 'Sweets', serving: '1 piece', grams: 35, kcal: 120, protein: 4, carbs: 16, fat: 4 },
  { id: 'modak', name: 'Modak', aliases: ['kozhukattai', 'ukadiche modak'], category: 'Sweets', serving: '1 piece', grams: 40, kcal: 110, protein: 1.5, carbs: 18, fat: 4 },
  { id: 'shrikhand', name: 'Shrikhand', category: 'Sweets', serving: '1 katori', grams: 100, kcal: 250, protein: 8, carbs: 35, fat: 9 },
  { id: 'rabri', name: 'Rabri', aliases: ['rabdi'], category: 'Sweets', serving: '1 katori', grams: 100, kcal: 260, protein: 7, carbs: 30, fat: 12 },
  { id: 'basundi', name: 'Basundi', category: 'Sweets', serving: '1 katori', grams: 100, kcal: 210, protein: 6, carbs: 25, fat: 9 },
  { id: 'falooda', name: 'Falooda', category: 'Sweets', serving: '1 glass', grams: 300, kcal: 400, protein: 9, carbs: 60, fat: 13 },
  { id: 'malpua', name: 'Malpua', category: 'Sweets', serving: '1 piece', grams: 60, kcal: 230, protein: 3, carbs: 30, fat: 11 },
  { id: 'ghevar', name: 'Ghevar', category: 'Sweets', serving: '1 piece', grams: 80, kcal: 350, protein: 5, carbs: 45, fat: 17 },
  { id: 'soan_papdi', name: 'Soan Papdi', aliases: ['son papdi'], category: 'Sweets', serving: '1 piece', grams: 30, kcal: 150, protein: 2, carbs: 18, fat: 8 },
  { id: 'chikki', name: 'Chikki', aliases: ['peanut chikki', 'kadlekai chikki'], category: 'Sweets', serving: '1 piece', grams: 30, kcal: 150, protein: 4, carbs: 17, fat: 8 },

  // Drinks
  { id: 'filter_coffee', name: 'Filter Coffee', aliases: ['coffee', 'kaapi'], category: 'Drinks', serving: '1 tumbler', grams: 120, kcal: 90, protein: 3, carbs: 12, fat: 3 },
  { id: 'masala_chai', name: 'Tea', aliases: ['chai', 'masala chai'], category: 'Drinks', serving: '1 cup', grams: 150, kcal: 80, protein: 2.5, carbs: 11, fat: 2.5 },
  { id: 'majjige', name: 'Buttermilk', aliases: ['majjige', 'chaas', 'neer mor'], category: 'Drinks', serving: '1 glass', grams: 200, kcal: 40, protein: 2, carbs: 3, fat: 1.5 },
  { id: 'ragi_malt', name: 'Ragi Malt', aliases: ['ragi ambli', 'ragi java'], category: 'Drinks', serving: '1 glass', grams: 200, kcal: 140, protein: 4, carbs: 24, fat: 3 },
  { id: 'tender_coconut', name: 'Tender Coconut Water', aliases: ['elaneer', 'coconut water'], category: 'Drinks', serving: '1 coconut', grams: 250, kcal: 50, protein: 0.5, carbs: 10, fat: 0.5 },
  { id: 'milk', name: 'Milk (toned)', aliases: ['haalu'], category: 'Drinks', serving: '1 glass', grams: 200, kcal: 120, protein: 6, carbs: 9.5, fat: 6 },
  { id: 'sweet_lassi', name: 'Sweet Lassi', aliases: ['lassi'], category: 'Drinks', serving: '1 glass', grams: 250, kcal: 230, protein: 8, carbs: 35, fat: 6 },
  { id: 'mango_lassi', name: 'Mango Lassi', category: 'Drinks', serving: '1 glass', grams: 250, kcal: 270, protein: 7, carbs: 45, fat: 6 },
  { id: 'nimbu_pani', name: 'Lemon Juice (with sugar)', aliases: ['nimbu pani', 'lemonade', 'nimbe hannu juice'], category: 'Drinks', serving: '1 glass', grams: 250, kcal: 80, protein: 0, carbs: 20, fat: 0 },
  { id: 'sugarcane_juice', name: 'Sugarcane Juice', aliases: ['kabbu juice', 'ganne ka ras'], category: 'Drinks', serving: '1 glass', grams: 250, kcal: 175, protein: 0, carbs: 44, fat: 0 },
  { id: 'badam_milk', name: 'Badam Milk', aliases: ['badam haalu'], category: 'Drinks', serving: '1 glass', grams: 200, kcal: 200, protein: 7, carbs: 25, fat: 8 },
  { id: 'cola', name: 'Cola / Soft Drink', aliases: ['coke', 'pepsi', 'thums up', 'sprite', 'fanta', 'cool drink', 'soda'], category: 'Drinks', serving: '1 can (330 ml)', grams: 330, kcal: 140, protein: 0, carbs: 35, fat: 0 },
  { id: 'diet_cola', name: 'Diet / Zero Soft Drink', aliases: ['diet coke', 'coke zero', 'pepsi black'], category: 'Drinks', serving: '1 can (330 ml)', grams: 330, kcal: 1, protein: 0, carbs: 0, fat: 0 },
  { id: 'lemon_soda', name: 'Lemon Soda', aliases: ['masala soda', 'goli soda', 'nimbu soda'], category: 'Drinks', serving: '1 glass', grams: 250, kcal: 90, protein: 0, carbs: 22, fat: 0 },
  { id: 'mango_drink', name: 'Mango Drink', aliases: ['maaza', 'frooti', 'slice', 'mango juice'], category: 'Drinks', serving: '1 bottle (250 ml)', grams: 250, kcal: 150, protein: 0, carbs: 37, fat: 0 },
  { id: 'packaged_juice', name: 'Packaged Fruit Juice', aliases: ['real juice', 'tropicana', 'juice box'], category: 'Drinks', serving: '1 pack (200 ml)', grams: 200, kcal: 110, protein: 0.5, carbs: 27, fat: 0 },
  { id: 'fresh_juice', name: 'Fresh Juice (with sugar)', aliases: ['orange juice', 'mosambi juice', 'sweet lime juice', 'pineapple juice', 'pomegranate juice'], category: 'Drinks', serving: '1 glass', grams: 250, kcal: 150, protein: 1, carbs: 36, fat: 0.5 },
  { id: 'watermelon_juice', name: 'Watermelon Juice', category: 'Drinks', serving: '1 glass', grams: 250, kcal: 90, protein: 1, carbs: 22, fat: 0.3 },
  { id: 'chocolate_milkshake', name: 'Chocolate Milkshake', aliases: ['milkshake', 'thick shake', 'oreo shake'], category: 'Drinks', serving: '1 glass', grams: 300, kcal: 400, protein: 10, carbs: 55, fat: 15 },
  { id: 'banana_milkshake', name: 'Banana Milkshake', aliases: ['banana shake'], category: 'Drinks', serving: '1 glass', grams: 300, kcal: 300, protein: 9, carbs: 50, fat: 7 },
  { id: 'mango_milkshake', name: 'Mango Milkshake', aliases: ['mango shake'], category: 'Drinks', serving: '1 glass', grams: 300, kcal: 330, protein: 8, carbs: 55, fat: 8 },
  { id: 'strawberry_milkshake', name: 'Strawberry Milkshake', aliases: ['strawberry shake'], category: 'Drinks', serving: '1 glass', grams: 300, kcal: 330, protein: 9, carbs: 50, fat: 10 },
  { id: 'cold_coffee', name: 'Cold Coffee', aliases: ['iced coffee', 'frappe'], category: 'Drinks', serving: '1 glass', grams: 300, kcal: 250, protein: 7, carbs: 35, fat: 9 },
  { id: 'rose_milk', name: 'Rose Milk', category: 'Drinks', serving: '1 glass', grams: 250, kcal: 220, protein: 7, carbs: 32, fat: 7 },
  { id: 'jaljeera', name: 'Jaljeera', aliases: ['jal jeera'], category: 'Drinks', serving: '1 glass', grams: 250, kcal: 40, protein: 0, carbs: 10, fat: 0 },
  { id: 'iced_tea', name: 'Iced Tea', aliases: ['lemon iced tea', 'peach iced tea'], category: 'Drinks', serving: '1 glass', grams: 300, kcal: 120, protein: 0, carbs: 30, fat: 0 },
  { id: 'energy_drink', name: 'Energy Drink', aliases: ['red bull', 'monster', 'sting'], category: 'Drinks', serving: '1 can (250 ml)', grams: 250, kcal: 110, protein: 0, carbs: 28, fat: 0 },
  { id: 'protein_shake', name: 'Protein Shake (with milk)', aliases: ['whey', 'protein powder'], category: 'Drinks', serving: '1 scoop + milk', grams: 300, kcal: 250, protein: 30, carbs: 18, fat: 6 },

  // International
  { id: 'pizza', name: 'Pizza', aliases: ['margherita', 'cheese pizza'], category: 'International', serving: '1 slice', grams: 107, kcal: 285, protein: 12, carbs: 36, fat: 10 },
  { id: 'burger', name: 'Burger', aliases: ['hamburger', 'cheeseburger', 'veg burger', 'chicken burger'], category: 'International', serving: '1 burger', grams: 200, kcal: 450, protein: 20, carbs: 45, fat: 20 },
  { id: 'french_fries', name: 'French Fries', aliases: ['fries', 'chips', 'finger chips'], category: 'International', serving: '1 medium portion', grams: 117, kcal: 365, protein: 4, carbs: 48, fat: 17 },
  { id: 'pasta', name: 'Pasta', aliases: ['spaghetti', 'penne', 'macaroni', 'arrabbiata', 'alfredo'], category: 'International', serving: '1 plate', grams: 300, kcal: 400, protein: 14, carbs: 70, fat: 8 },
  { id: 'hakka_noodles', name: 'Hakka Noodles', aliases: ['chow mein', 'chowmein', 'noodles'], category: 'International', serving: '1 plate', grams: 250, kcal: 420, protein: 9, carbs: 60, fat: 15 },
  { id: 'sushi', name: 'Sushi', aliases: ['maki', 'sushi roll'], category: 'International', serving: '6 pieces', grams: 160, kcal: 250, protein: 9, carbs: 45, fat: 3 },
  { id: 'ramen', name: 'Ramen', aliases: ['noodle soup'], category: 'International', serving: '1 bowl', grams: 500, kcal: 450, protein: 18, carbs: 60, fat: 15 },
  { id: 'club_sandwich', name: 'Club Sandwich', aliases: ['chicken sandwich'], category: 'International', serving: '1 sandwich', grams: 250, kcal: 550, protein: 30, carbs: 45, fat: 28 },
  { id: 'caesar_salad', name: 'Caesar Salad', aliases: ['salad bowl'], category: 'International', serving: '1 bowl', grams: 200, kcal: 330, protein: 10, carbs: 12, fat: 27 },
  { id: 'fried_chicken', name: 'Fried Chicken', aliases: ['kfc', 'chicken wings', 'chicken strips'], category: 'International', serving: '2 pieces', grams: 200, kcal: 520, protein: 40, carbs: 16, fat: 33 },
  { id: 'grilled_chicken', name: 'Grilled Chicken', aliases: ['chicken breast'], category: 'International', serving: '1 breast', grams: 150, kcal: 250, protein: 45, carbs: 0, fat: 6 },
  { id: 'steak', name: 'Steak', aliases: ['beef steak'], category: 'International', serving: '1 steak', grams: 200, kcal: 500, protein: 50, carbs: 0, fat: 33 },
  { id: 'hot_dog', name: 'Hot Dog', category: 'International', serving: '1 hot dog', grams: 100, kcal: 290, protein: 11, carbs: 24, fat: 17 },
  { id: 'tacos', name: 'Tacos', category: 'International', serving: '2 tacos', grams: 200, kcal: 400, protein: 20, carbs: 36, fat: 20 },
  { id: 'burrito', name: 'Burrito', aliases: ['burrito bowl'], category: 'International', serving: '1 burrito', grams: 300, kcal: 600, protein: 25, carbs: 75, fat: 22 },
  { id: 'shawarma', name: 'Shawarma', aliases: ['chicken shawarma', 'shawarma roll'], category: 'International', serving: '1 roll', grams: 250, kcal: 500, protein: 30, carbs: 45, fat: 22 },
  { id: 'falafel', name: 'Falafel', category: 'International', serving: '4 pieces', grams: 70, kcal: 230, protein: 9, carbs: 21, fat: 13 },
  { id: 'hummus', name: 'Hummus', category: 'International', serving: '1 katori', grams: 100, kcal: 166, protein: 8, carbs: 14, fat: 10 },
  { id: 'pad_thai', name: 'Pad Thai', category: 'International', serving: '1 plate', grams: 300, kcal: 550, protein: 20, carbs: 70, fat: 20 },
  { id: 'dim_sum', name: 'Dim Sum', aliases: ['dumplings', 'gyoza'], category: 'International', serving: '6 pieces', grams: 150, kcal: 260, protein: 12, carbs: 30, fat: 10 },
  { id: 'tomato_soup', name: 'Tomato Soup', aliases: ['soup'], category: 'International', serving: '1 bowl', grams: 250, kcal: 120, protein: 3, carbs: 20, fat: 3 },
  { id: 'pancakes', name: 'Pancakes', aliases: ['pancake'], category: 'International', serving: '2 pancakes + syrup', grams: 150, kcal: 350, protein: 8, carbs: 55, fat: 10 },
  { id: 'waffles', name: 'Waffle', aliases: ['waffles'], category: 'International', serving: '1 waffle', grams: 75, kcal: 220, protein: 6, carbs: 25, fat: 11 },
  { id: 'donut', name: 'Donut', aliases: ['doughnut'], category: 'International', serving: '1 donut', grams: 60, kcal: 240, protein: 3, carbs: 30, fat: 13 },
  { id: 'chocolate_cake', name: 'Chocolate Cake', aliases: ['cake', 'pastry'], category: 'International', serving: '1 slice', grams: 95, kcal: 350, protein: 5, carbs: 50, fat: 15 },
  { id: 'ice_cream', name: 'Ice Cream', aliases: ['gelato', 'sundae'], category: 'International', serving: '1 cup', grams: 100, kcal: 207, protein: 3.5, carbs: 24, fat: 11 },
  { id: 'croissant', name: 'Croissant', category: 'International', serving: '1 croissant', grams: 57, kcal: 230, protein: 5, carbs: 26, fat: 12 },
  { id: 'brownie', name: 'Brownie', category: 'International', serving: '1 piece', grams: 60, kcal: 260, protein: 3, carbs: 35, fat: 13 },
  { id: 'cupcake', name: 'Cupcake', aliases: ['muffin'], category: 'International', serving: '1 cupcake', grams: 60, kcal: 230, protein: 2, carbs: 33, fat: 10 },
  { id: 'cheesecake', name: 'Cheesecake', category: 'International', serving: '1 slice', grams: 100, kcal: 320, protein: 6, carbs: 26, fat: 22 },
  { id: 'cookies', name: 'Cookies', aliases: ['biscuits', 'cookie'], category: 'International', serving: '2 cookies', grams: 30, kcal: 150, protein: 2, carbs: 20, fat: 7 },

  // Fruits & Nuts
  { id: 'banana', name: 'Banana', aliases: ['bale hannu'], category: 'Fruits & Nuts', serving: '1 medium', grams: 118, kcal: 105, protein: 1.3, carbs: 27, fat: 0.4 },
  { id: 'apple', name: 'Apple', aliases: ['sebu'], category: 'Fruits & Nuts', serving: '1 medium', grams: 180, kcal: 95, protein: 0.5, carbs: 25, fat: 0.3 },
  { id: 'mango', name: 'Mango', aliases: ['mavina hannu', 'aam'], category: 'Fruits & Nuts', serving: '1 cup sliced', grams: 165, kcal: 100, protein: 1.4, carbs: 25, fat: 0.6 },
  { id: 'papaya', name: 'Papaya', aliases: ['parangi hannu'], category: 'Fruits & Nuts', serving: '1 cup', grams: 145, kcal: 62, protein: 0.7, carbs: 16, fat: 0.4 },
  { id: 'guava', name: 'Guava', aliases: ['seebe hannu', 'amrood'], category: 'Fruits & Nuts', serving: '1 medium', grams: 100, kcal: 68, protein: 2.6, carbs: 14, fat: 1 },
  { id: 'orange', name: 'Orange', aliases: ['kittale', 'santra'], category: 'Fruits & Nuts', serving: '1 medium', grams: 130, kcal: 62, protein: 1.2, carbs: 15, fat: 0.2 },
  { id: 'watermelon', name: 'Watermelon', aliases: ['kallangadi'], category: 'Fruits & Nuts', serving: '1 cup', grams: 150, kcal: 45, protein: 0.9, carbs: 11, fat: 0.2 },
  { id: 'grapes', name: 'Grapes', aliases: ['drakshi'], category: 'Fruits & Nuts', serving: '1 cup', grams: 150, kcal: 104, protein: 1.1, carbs: 27, fat: 0.2 },
  { id: 'sprouts', name: 'Sprouts Salad', aliases: ['moong sprouts', 'mole kaalu'], category: 'Fruits & Nuts', serving: '1 katori', grams: 100, kcal: 70, protein: 5, carbs: 11, fat: 0.5 },
  { id: 'roasted_chana', name: 'Roasted Chana', aliases: ['hurigadale', 'bhuna chana'], category: 'Fruits & Nuts', serving: '1 handful', grams: 30, kcal: 110, protein: 6, carbs: 17, fat: 1.5 },
  { id: 'peanuts', name: 'Peanuts (roasted)', aliases: ['kadlekai', 'groundnut', 'moongphali'], category: 'Fruits & Nuts', serving: '1 handful', grams: 30, kcal: 170, protein: 7, carbs: 5, fat: 14 },
  { id: 'almonds', name: 'Almonds', aliases: ['badam'], category: 'Fruits & Nuts', serving: '10 pieces', grams: 12, kcal: 70, protein: 2.5, carbs: 2.5, fat: 6 },

  // Basics
  { id: 'paneer', name: 'Paneer', category: 'Basics', serving: '100 g', grams: 100, kcal: 265, protein: 18, carbs: 3.5, fat: 20 },
  { id: 'ghee', name: 'Ghee', aliases: ['tuppa'], category: 'Basics', serving: '1 tsp', grams: 5, kcal: 45, protein: 0, carbs: 0, fat: 5 },
  { id: 'butter', name: 'Butter', aliases: ['benne'], category: 'Basics', serving: '1 tsp', grams: 5, kcal: 36, protein: 0, carbs: 0, fat: 4 },
  { id: 'sugar', name: 'Sugar', aliases: ['sakkare'], category: 'Basics', serving: '1 tsp', grams: 5, kcal: 20, protein: 0, carbs: 5, fat: 0 },
];

const ALL_FOODS: Food[] = [...FOODS, ...INDB_FOODS];

export function findFood(id: string): Food | undefined {
  return ALL_FOODS.find((f) => f.id === id);
}

/** Our hand-checked dishes come first; INDB dishes fill in everything else. */
export function searchFoods(query: string): Food[] {
  const q = query.trim().toLowerCase();
  if (!q) return FOODS;
  return ALL_FOODS.filter(
    (f) => f.name.toLowerCase().includes(q) || f.aliases?.some((a) => a.toLowerCase().includes(q))
  );
}
