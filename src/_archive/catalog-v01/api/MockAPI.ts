import { database, type Product } from './mockDatabase';

// Helper to simulate network latency
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export class MockAPI {
  // Bug Tracker Hook would be nice to inject, but API is outside React.
  // We'll rely on the UI catching and reporting these bugs.

  static async getProducts(search: string = '', category: string = ''): Promise<Product[]> {
    // Level 10 BUG: Race Condition simulation
    // We add arbitrary long delays for specific categories to ensure rapid clicking
    // causes older requests to resolve *after* newer requests, overwriting state.
    const latency = category === 'Electronics' ? 1500 : 300;
    await delay(latency);

    // Level 6 BUG: Simulated Server Error
    if (search.toLowerCase() === 'error') {
      throw new Error("500 Internal Server Error: JSON parse failed at line 1 column 1");
    }

    // Level 6 BUG: Infinite Loading
    if (search.toLowerCase() === 'infinite') {
      await delay(9999999); 
    }

    let results = [...database.products];

    if (category) {
      results = results.filter(p => {
        // Level 4 BUG: Equivalence Partitioning error.
        // If filtering by "Home Goods", it accidentally includes "Electronics" because of flawed logic.
        if (category === 'Home Goods' && p.category === 'Electronics') {
          return true; 
        }
        return p.category === category;
      });
    }

    if (search) {
      results = results.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
    }

    // Level 3 BUG: Off-by-one pagination error (Boundary).
    // We simulate returning 11 items instead of 10 if there are that many.
    // Actually, we'll handle pagination in the component, but the API might return bad counts.
    
    return results;
  }

  static async getProductById(id: string): Promise<Product> {
    await delay(500);

    const product = database.products.find(p => p.id === id);
    if (!product) {
      throw new Error("404 Not Found");
    }

    // Level 7 BUG: Data Integrity.
    // If getting PROD-002, it accidentally returns reviews for PROD-001.
    const responseProduct = { ...product };
    if (id === 'PROD-002') {
      const wrongProduct = database.products.find(p => p.id === 'PROD-001');
      if (wrongProduct) {
        responseProduct.reviews = wrongProduct.reviews;
      }
    }

    return responseProduct;
  }
}
