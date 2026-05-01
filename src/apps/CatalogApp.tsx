import React, { useState } from 'react';
import { ArrowLeft, Search, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const MOCK_PRODUCTS = [
  {
    id: 1,
    name: "Wireless Noise-Cancelling Headphones",
    price: 299.99,
    rating: 4.8,
    reviews: 124,
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=500&q=60",
    description: "Premium sound quality with active noise cancellation."
  },
  {
    id: 2,
    name: "Ergonomic Office Chair",
    price: 199.50,
    rating: 4.5,
    reviews: 89,
    image: "https://images.unsplash.com/photo-1505843490538-5133c6c7d0e1?auto=format&fit=crop&w=500&q=60",
    description: "Comfortable chair with lumbar support for long hours."
  },
  {
    id: 3,
    // BUG LEVEL 1: Typo in title ("Smatwatch" instead of "Smartwatch")
    name: "Smatwatch Pro Series 5",
    price: 349.00,
    rating: 4.9,
    reviews: 312,
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=500&q=60",
    description: "Track your fitness and stay connected on the go."
  },
  {
    id: 4,
    name: "Mechanical Gaming Keyboard",
    price: 129.99,
    rating: 4.7,
    reviews: 201,
    // BUG LEVEL 1: Broken image link
    image: "https://images.unsplash.com/photo-invalid-image-url?auto=format&fit=crop&w=500&q=60",
    description: "RGB backlit mechanical keyboard with tactile switches."
  },
  {
    id: 5,
    name: "4K Ultra HD Monitor",
    price: 399.00,
    rating: 4.6,
    reviews: 156,
    image: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=500&q=60",
    description: "Crystal clear display for work and entertainment."
  },
  {
    id: 6,
    name: "Portable Power Bank 20000mAh",
    price: 49.99,
    rating: 4.4,
    reviews: 432,
    image: "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?auto=format&fit=crop&w=500&q=60",
    description: "Fast charging power bank for all your devices."
  }
];

export const CatalogApp = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredProducts = MOCK_PRODUCTS.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleBuyNow = (id: number) => {
    // BUG LEVEL 2: Broken Navigation / 404 simulation for a specific product ID
    if (id === 2) {
      navigate('/checkout/invalid-session-xyz'); // Leads to nowhere
    } else {
      alert(`Added product ${id} to cart! (Simulated)`);
    }
  };

  return (
    <div className="container animate-fade-in" style={{ paddingBottom: '4rem' }}>
      <button 
        className="btn btn-secondary" 
        onClick={() => navigate('/')}
        style={{ marginBottom: '2rem' }}
      >
        <ArrowLeft size={18} /> Back to Hub
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>TechMart Catalog</h1>
          <p>Find the best tech gadgets. (Difficulty: Easy)</p>
        </div>
        <div className="input-group" style={{ margin: 0, minWidth: '300px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-disabled)' }} />
            <input 
              type="text" 
              className="input-field" 
              placeholder="Search products..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', paddingLeft: '2.5rem' }}
            />
          </div>
        </div>
      </div>

      <div className="grid-cards">
        {filteredProducts.map(product => (
          <div key={product.id} className="glass-panel" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ height: '200px', backgroundColor: 'var(--bg-surface-elevated)' }}>
              <img 
                src={product.image} 
                alt={product.name} 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                // Intentionally omitting an error handler to let the broken image bug (Level 1) be visible
              />
            </div>
            
            {/* BUG LEVEL 2: UI alignment issue. Hardcoded negative margin that breaks on smaller screens */}
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', flexGrow: 1, position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', marginRight: '1rem' }}>{product.name}</h3>
                <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)' }}>${product.price.toFixed(2)}</span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '1rem', color: '#eab308' }}>
                <Star size={16} fill="currentColor" />
                <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{product.rating} ({product.reviews})</span>
              </div>

              <p style={{ fontSize: '0.9rem', marginBottom: '1.5rem', flexGrow: 1 }}>{product.description}</p>

              {/* Bug Level 2 Alignment part 2: This button has a fixed width that might overflow slightly on very small devices */}
              <button 
                className="btn btn-primary" 
                style={{ width: '110%', marginLeft: '-5%' }} 
                onClick={() => handleBuyNow(product.id)}
              >
                Buy Now
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
