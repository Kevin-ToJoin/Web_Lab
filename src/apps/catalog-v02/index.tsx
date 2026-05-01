import { BugTrackerProvider } from './context/BugTrackerContext';
import { CartProvider } from './context/CartContext';
import { QAPanelProvider } from './context/QAPanelContext';
import { Routes, Route } from 'react-router-dom';

import { CatalogV02Layout } from './components/CatalogV02Layout';

// Importing the 10 pages
import { CatalogHome } from './pages/CatalogHome';
import { CategoryView } from './pages/CategoryView';
import { SearchResults } from './pages/SearchResults';
import { ProductDetail } from './pages/ProductDetail';
import { ReviewsView } from './pages/ReviewsView';
import { CartPage } from './pages/CartPage';
import { CheckoutShipping } from './pages/CheckoutShipping';
import { CheckoutPayment } from './pages/CheckoutPayment';
import { OrderConfirmation } from './pages/OrderConfirmation';
import { UserProfile } from './pages/UserProfile';

export const CatalogAppV02 = () => {
  return (
    <BugTrackerProvider>
      <CartProvider>
        <QAPanelProvider>
          <Routes>
            <Route path="/" element={<CatalogV02Layout />}>
              <Route index element={<CatalogHome />} />
              <Route path="category/:catName" element={<CategoryView />} />
              <Route path="search" element={<SearchResults />} />
              <Route path="product/:id" element={<ProductDetail />} />
              <Route path="product/:id/reviews" element={<ReviewsView />} />
              <Route path="cart" element={<CartPage />} />
              <Route path="checkout/shipping" element={<CheckoutShipping />} />
              <Route path="checkout/payment" element={<CheckoutPayment />} />
              <Route path="checkout/success" element={<OrderConfirmation />} />
              <Route path="profile" element={<UserProfile />} />
            </Route>
          </Routes>
        </QAPanelProvider>
      </CartProvider>
    </BugTrackerProvider>
  );
};
