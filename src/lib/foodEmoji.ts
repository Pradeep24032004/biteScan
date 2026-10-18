// Picks an emoji for a logged food from words in its name (works for custom and scanned foods too).

const RULES: [RegExp, string][] = [
  [/coffee|chai|\btea\b/i, '☕'],
  [/ice ?cream|kulfi|sundae|falooda/i, '🍨'],
  [/milkshake|shake|smoothie|lassi|buttermilk|majjige/i, '🥤'],
  [/cola|soda|soft drink|juice|lemonade|nimbu|drink|sharbat|jaljeera/i, '🧃'],
  [/cake|pastry|brownie|muffin|cookie|biscuit|donut/i, '🍰'],
  [/ladoo|laddu|halwa|jamun|barfi|burfi|peda|jalebi|mysore pak|rasgulla|rasmalai|kheer|payasam|sweet|kalakand|shrikhand|gulab/i, '🍬'],
  [/biryani|pulao|fried rice/i, '🍛'],
  [/idli|idly|vada|pongal|upma|poha|kesari/i, '🍚'],
  [/dosa|chapati|roti|paratha|naan|kulcha|puri|poori|bhatura|akki|ragi|thepla|appam|pathiri/i, '🫓'],
  [/bath|rice|curd rice|lemon rice|khichdi|meals|thali/i, '🍚'],
  [/egg|omelette|bhurji/i, '🥚'],
  [/fish|prawn|shrimp|crab/i, '🐟'],
  [/chicken|mutton|lamb|kebab|tikka|keema|meat/i, '🍗'],
  [/pizza/i, '🍕'],
  [/burger/i, '🍔'],
  [/noodle|ramen|pasta|maggi|chowmein/i, '🍜'],
  [/sandwich|toast|bread/i, '🥪'],
  [/salad|sprouts/i, '🥗'],
  [/banana|apple|mango|fruit|papaya|orange|grapes|guava|watermelon/i, '🍎'],
  [/chips|namkeen|mixture|bhujia|popcorn|nachos|kurkure|snack/i, '🍿'],
  [/samosa|pakora|bajji|bonda|pani puri|bhel|chaat|kachori|cutlet/i, '🥟'],
  [/dal|sambar|rasam|curry|gravy|paneer|chole|rajma|kootu|palya|sabzi|korma/i, '🍲'],
  [/chocolate|candy/i, '🍫'],
  [/nuts|almond|cashew|peanut/i, '🥜'],
  [/milk|curd|yogurt|dahi/i, '🥛'],
];

export function foodEmoji(name: string): string {
  for (const [pattern, emoji] of RULES) if (pattern.test(name)) return emoji;
  return '🍽️';
}
