export interface Review {
  id: string;
  userName: string;
  rating: number;
  comment: string;
  date: string;
}

export interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
  category: 'Beans' | 'Equipment' | 'Accessories';
  description: string;
  image: string;
  tags: string[];
  reviews: Review[];
}

export const PRODUCTS: Product[] = [
  {
    id: 101, name: 'Premium Coffee Beans', price: 24.99, stock: 8, category: 'Beans',
    description: 'Single-origin Ethiopian beans, medium roast with notes of blueberry and dark chocolate.',
    image: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=500&q=60',
    tags: ['beans', 'ethiopian', 'medium-roast'],
    reviews: [
      { id: 'R-101-1', userName: 'MariaK', rating: 5, comment: 'Best beans I have bought online.', date: '2026-03-02' },
      { id: 'R-101-2', userName: 'DevOnCoffee', rating: 4, comment: 'Great flavor, a bit pricey.', date: '2026-04-11' },
    ],
  },
  {
    id: 102, name: 'Ceramic Mug', price: 12.50, stock: 3, category: 'Accessories',
    description: 'Minimalist 350ml ceramic mug, dishwasher and microwave safe.',
    image: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=500&q=60',
    tags: ['mug', 'ceramic', 'kitchen'],
    reviews: [
      { id: 'R-102-1', userName: 'JaneD', rating: 5, comment: 'Sturdy and looks great on my desk.', date: '2026-01-20' },
    ],
  },
  {
    id: 103, name: 'Pour-over Coffee Maker', price: 35.00, stock: 0, category: 'Equipment',
    description: 'Borosilicate glass pour-over with a reusable stainless steel filter.',
    image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=500&q=60',
    tags: ['brewer', 'pour-over', 'glass'],
    reviews: [
      { id: 'R-103-1', userName: 'BrewMaster', rating: 5, comment: 'Perfect cup every time.', date: '2026-02-14' },
      { id: 'R-103-2', userName: 'CoffeeNoob', rating: 3, comment: 'Takes practice to get the pour right.', date: '2026-02-28' },
    ],
  },
  {
    id: 104, name: 'Electric Grinder', price: 75.00, stock: 5, category: 'Equipment',
    description: 'Conical burr grinder with 18 grind settings, from espresso to French press.',
    image: 'https://images.unsplash.com/photo-1516224498413-84ecf3a1e7fd?auto=format&fit=crop&w=500&q=60',
    tags: ['grinder', 'electric', 'burr'],
    reviews: [],
  },
  {
    id: 105, name: 'French Press', price: 28.00, stock: 12, category: 'Equipment',
    description: '1L borosilicate glass French press with a stainless steel mesh filter.',
    image: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=500&q=60',
    tags: ['brewer', 'french-press', 'glass'],
    reviews: [
      { id: 'R-105-1', userName: 'MorningRush', rating: 4, comment: 'Easy to use, easy to clean.', date: '2026-05-03' },
    ],
  },
  {
    id: 106, name: 'Travel Tumbler', price: 18.75, stock: 20, category: 'Accessories',
    description: 'Insulated 16oz stainless steel tumbler, keeps coffee hot for 6 hours.',
    image: 'https://images.unsplash.com/photo-1523362628745-0c100150b504?auto=format&fit=crop&w=500&q=60',
    tags: ['tumbler', 'travel', 'insulated'],
    reviews: [],
  },
  {
    id: 107, name: 'Decaf Coffee Beans', price: 22.99, stock: 6, category: 'Beans',
    description: 'Swiss Water Process decaf, dark roast with a smooth, low-acidity finish.',
    image: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=500&q=60',
    tags: ['beans', 'decaf', 'dark-roast'],
    reviews: [
      { id: 'R-107-1', userName: 'NightOwl', rating: 5, comment: 'Finally a decaf that tastes like real coffee.', date: '2026-06-01' },
    ],
  },
  {
    id: 108, name: 'Digital Scale', price: 22.00, stock: 9, category: 'Equipment',
    description: '0.1g precision scale with built-in timer, ideal for pour-over ratios.',
    image: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=500&q=60',
    tags: ['scale', 'precision', 'timer'],
    reviews: [],
  },
];
