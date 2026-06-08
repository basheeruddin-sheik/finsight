// Curated lucide icon catalog for transaction types & expense categories.
//
// Icons are stored in the DB as a *name* string (e.g. "wallet"). The hybrid
// <ConfigIcon> renderer maps known names → lucide components, and falls back to
// rendering the raw value as text — so legacy emoji values still display while
// new/edited items use clean vector icons. No destructive migration required.

import {
  Wallet, Banknote, CreditCard, PiggyBank, Landmark, Coins, Receipt,
  TrendingUp, TrendingDown, LineChart,
  Utensils, Coffee, Pizza, Beer, Wine, Apple, Cake, Soup,
  ShoppingCart, ShoppingBag, Shirt, Gift, Tag, Watch, Gem,
  Car, Fuel, Bus, Plane, TrainFront, Bike, Ship, Truck,
  Home, Lightbulb, Wrench, Plug, Sofa, Droplet, Flame, Wifi,
  Heart, Pill, Stethoscope, Activity, Dumbbell, Cross,
  Smartphone, Laptop, Tv, Headphones, Camera, Gamepad2,
  Book, GraduationCap, Briefcase, PawPrint, Baby, Music, Film, Globe,
  User, Users, HandCoins, Handshake, UserPlus,
  type LucideIcon,
} from 'lucide-react';

// name → component
export const CONFIG_ICON_MAP: Record<string, LucideIcon> = {
  // Finance
  'wallet': Wallet, 'banknote': Banknote, 'credit-card': CreditCard, 'piggy-bank': PiggyBank,
  'landmark': Landmark, 'coins': Coins, 'receipt': Receipt,
  'trending-up': TrendingUp, 'trending-down': TrendingDown, 'line-chart': LineChart,
  // Food
  'utensils': Utensils, 'coffee': Coffee, 'pizza': Pizza, 'beer': Beer, 'wine': Wine,
  'apple': Apple, 'cake': Cake, 'soup': Soup,
  // Shopping
  'shopping-cart': ShoppingCart, 'shopping-bag': ShoppingBag, 'shirt': Shirt, 'gift': Gift,
  'tag': Tag, 'watch': Watch, 'gem': Gem,
  // Transport
  'car': Car, 'fuel': Fuel, 'bus': Bus, 'plane': Plane, 'train': TrainFront, 'bike': Bike,
  'ship': Ship, 'truck': Truck,
  // Home & Bills
  'home': Home, 'lightbulb': Lightbulb, 'wrench': Wrench, 'plug': Plug, 'sofa': Sofa,
  'droplet': Droplet, 'flame': Flame, 'wifi': Wifi,
  // Health
  'heart': Heart, 'pill': Pill, 'stethoscope': Stethoscope, 'activity': Activity,
  'dumbbell': Dumbbell, 'cross': Cross,
  // Tech
  'smartphone': Smartphone, 'laptop': Laptop, 'tv': Tv, 'headphones': Headphones,
  'camera': Camera, 'gamepad': Gamepad2,
  // Life
  'book': Book, 'graduation-cap': GraduationCap, 'briefcase': Briefcase, 'paw-print': PawPrint,
  'baby': Baby, 'music': Music, 'film': Film, 'globe': Globe,
  // People
  'user': User, 'users': Users, 'hand-coins': HandCoins, 'handshake': Handshake, 'user-plus': UserPlus,
};

// Grouped catalog for the picker
export const CONFIG_ICON_GROUPS: { label: string; icons: string[] }[] = [
  { label: 'Finance',      icons: ['wallet','banknote','credit-card','piggy-bank','landmark','coins','receipt','trending-up','trending-down','line-chart'] },
  { label: 'Food',         icons: ['utensils','coffee','pizza','beer','wine','apple','cake','soup'] },
  { label: 'Shopping',     icons: ['shopping-cart','shopping-bag','shirt','gift','tag','watch','gem'] },
  { label: 'Transport',    icons: ['car','fuel','bus','plane','train','bike','ship','truck'] },
  { label: 'Home & Bills', icons: ['home','lightbulb','wrench','plug','sofa','droplet','flame','wifi'] },
  { label: 'Health',       icons: ['heart','pill','stethoscope','activity','dumbbell','cross'] },
  { label: 'Tech',         icons: ['smartphone','laptop','tv','headphones','camera','gamepad'] },
  { label: 'Life',         icons: ['book','graduation-cap','briefcase','paw-print','baby','music','film','globe'] },
  { label: 'People',       icons: ['user','users','hand-coins','handshake','user-plus'] },
];

// Per-group accent palette → every icon inherits its group's color.
// Full literal class strings so Tailwind's content scanner picks them up.
const GROUP_COLOR: Record<string, { text: string; bg: string }> = {
  'Finance':      { text: 'text-emerald-600', bg: 'bg-emerald-50' },
  'Food':         { text: 'text-orange-600',  bg: 'bg-orange-50'  },
  'Shopping':     { text: 'text-pink-600',    bg: 'bg-pink-50'    },
  'Transport':    { text: 'text-blue-600',    bg: 'bg-blue-50'    },
  'Home & Bills': { text: 'text-amber-600',   bg: 'bg-amber-50'   },
  'Health':       { text: 'text-rose-600',    bg: 'bg-rose-50'    },
  'Tech':         { text: 'text-violet-600',  bg: 'bg-violet-50'  },
  'Life':         { text: 'text-teal-600',    bg: 'bg-teal-50'    },
  'People':       { text: 'text-indigo-600',  bg: 'bg-indigo-50'  },
};

const NEUTRAL = { text: 'text-slate-500', bg: 'bg-slate-100' };

// name → { text, bg }
export const CONFIG_ICON_COLOR: Record<string, { text: string; bg: string }> = {};
CONFIG_ICON_GROUPS.forEach(g => g.icons.forEach(n => { CONFIG_ICON_COLOR[n] = GROUP_COLOR[g.label] ?? NEUTRAL; }));

export const getIconColor = (name: string) => CONFIG_ICON_COLOR[name] ?? NEUTRAL;

// Hybrid renderer: lucide icon for known names, raw text (emoji) otherwise.
export function ConfigIcon({ name, size = 20, className = '', strokeWidth = 2 }: {
  name: string;
  size?: number;
  className?: string;
  strokeWidth?: number;
}) {
  const Icon = CONFIG_ICON_MAP[name];
  if (Icon) return <Icon size={size} strokeWidth={strokeWidth} className={className} />;
  // legacy emoji / unknown value — render as text at roughly the same box size
  return <span className={className} style={{ fontSize: size * 0.9, lineHeight: 1 }}>{name}</span>;
}

// Colored icon on its matching tinted background. `className` controls the box
// dimensions/rounding (e.g. "w-10 h-10 rounded-full").
export function IconBadge({ name, size = 20, className = '' }: {
  name: string;
  size?: number;
  className?: string;
}) {
  const { text, bg } = getIconColor(name);
  return (
    <div className={`flex items-center justify-center shrink-0 ${bg} ${className}`}>
      <ConfigIcon name={name} size={size} className={text} />
    </div>
  );
}

export const isConfigIconName = (v: string) => v in CONFIG_ICON_MAP;
