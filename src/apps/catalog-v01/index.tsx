
import { BugTrackerProvider } from './context/BugTrackerContext';
import { CartProvider } from './context/CartContext';
import { CatalogHub } from './pages/CatalogHub';
import { Routes, Route } from 'react-router-dom';
import { ProductDetail } from './pages/ProductDetail';
import { CartPage } from './pages/CartPage';

export const CatalogAppV01 = () => {
  return (
    <BugTrackerProvider>
      <CartProvider>
        <Routes>
          <Route path="/" element={<CatalogHub />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/cart" element={<CartPage />} />
        </Routes>
      </CartProvider>
    </BugTrackerProvider>
  );
};
