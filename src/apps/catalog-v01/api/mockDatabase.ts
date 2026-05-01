export interface ProductReview {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  date: string;
}

export interface Product {
  id: string;
  name: string;
  category: 'Electronics' | 'Home Goods' | 'Apparel' | 'Accessories';
  price: number;
  stock: number;
  description: string;
  images: string[];
  reviews: ProductReview[];
  tags: string[];
}

// MOCK DB
export const database = {
  products: [
    {
      id: 'PROD-001',
      name: 'Ultra HD 4K Smart TV',
      category: 'Electronics',
      price: 599.99,
      stock: 50,
      description: 'Stunning 4K resolution with smart capabilities. Lorem ipsum dolor sit amet.', // Level 1 Bug: placeholder text left in description
      images: ['https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=500&q=60'],
      tags: ['tv', '4k', 'smart'],
      reviews: [
        { id: 'REV-001', userId: 'U-100', userName: 'JohnD', rating: 5, comment: 'Great TV!', date: '2023-10-01' }
      ]
    },
    {
      id: 'PROD-002',
      name: 'Noise Cancelling Headphones',
      category: 'Electronics',
      price: 249.50, // Boundary testing: exactly .50
      stock: 15,
      description: 'Industry leading noise cancellation.',
      images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=500&q=60'],
      tags: ['audio', 'headphones', 'wireless'],
      reviews: []
    },
    {
      id: 'PROD-003',
      name: 'Ergonomic Office Chair',
      category: 'Home Goods',
      price: 199.00,
      stock: 0, // Out of stock boundary
      description: 'Supportive chair for long hours.',
      images: ['https://images.unsplash.com/photo-1505843490538-5133c6c7d0e1?auto=format&fit=crop&w=500&q=60'],
      tags: ['furniture', 'office', 'chair'],
      reviews: [
        { id: 'REV-002', userId: 'U-101', userName: 'JaneSmith', rating: 4, comment: 'Very comfortable but assembly was hard.', date: '2023-10-05' }
      ]
    },
    {
      id: 'PROD-004',
      name: 'Smartwatch Pro',
      category: 'Electronics',
      price: 299.99,
      stock: 120,
      description: 'Track your fitness and stay connected.',
      images: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=500&q=60'],
      tags: ['wearable', 'smartwatch', 'fitness'],
      reviews: []
    },
    {
      id: 'PROD-005',
      name: 'Cotton T-Shirt',
      category: 'Apparel',
      price: 15.00,
      stock: 500,
      description: 'Basic cotton t-shirt.',
      images: ['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=500&q=60'],
      tags: ['clothing', 'shirt', 'basic'],
      reviews: []
    },
    {
      id: 'PROD-006',
      name: 'Wireless Mouse',
      category: 'Electronics', // Level 4 Bug: this might accidentally be tagged Home Goods in the API logic later
      price: 25.00,
      stock: 45,
      description: 'Ergonomic wireless mouse.',
      images: ['https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=500&q=60'],
      tags: ['accessory', 'mouse', 'wireless'],
      reviews: []
    },
    {
      id: 'PROD-007',
      name: 'Mechanical Keyboard',
      category: 'Electronics',
      price: 120.00,
      stock: 30,
      description: 'Tactile mechanical switches.',
      images: ['https://images.unsplash.com/photo-1595225476474-87563907a212?auto=format&fit=crop&w=500&q=60'],
      tags: ['accessory', 'keyboard', 'gaming'],
      reviews: []
    },
    {
      id: 'PROD-008',
      name: 'Ceramic Coffee Mug',
      category: 'Home Goods',
      price: 12.50,
      stock: 100,
      description: 'Minimalist ceramic mug.',
      images: ['https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=500&q=60'],
      tags: ['kitchen', 'mug', 'coffee'],
      reviews: []
    },
    {
      id: 'PROD-009',
      name: 'Running Shoes',
      category: 'Apparel',
      price: 89.99,
      stock: 25,
      description: 'Lightweight running shoes.',
      images: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=500&q=60'],
      tags: ['shoes', 'running', 'fitness'],
      reviews: []
    },
    {
      id: 'PROD-010',
      name: 'Laptop Backpack',
      category: 'Accessories',
      price: 45.00,
      stock: 60,
      description: 'Water-resistant laptop backpack.',
      images: ['https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=500&q=60'],
      tags: ['bag', 'backpack', 'travel'],
      reviews: []
    },
    {
      id: 'PROD-011',
      name: 'Gaming Monitor',
      category: 'Electronics',
      price: 349.99,
      stock: 20,
      description: '144Hz curved gaming monitor.',
      images: ['https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=500&q=60'],
      tags: ['monitor', 'gaming', 'pc'],
      reviews: []
    },
    {
      id: 'PROD-012',
      name: 'Laptap Stand', // Level 1 Bug: Typo "Laptap"
      category: 'Accessories',
      price: 29.99,
      stock: 150,
      description: 'Adjustable aluminum stand.',
      images: ['https://images.unsplash.com/photo-broken-link-12345?auto=format&fit=crop&w=500&q=60'], // Level 1 Bug: Broken image
      tags: ['stand', 'laptop', 'accessory'],
      reviews: []
    }
  ] as Product[]
};
