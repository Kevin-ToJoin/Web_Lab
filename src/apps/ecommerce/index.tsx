import { Routes, Route } from 'react-router-dom';
import { QALayout } from '../../qa/QALayout';
import { CartProvider } from './context/CartContext';
import { Storefront } from './pages/Storefront';
import { ProductDetail } from './pages/ProductDetail';
import { Cart } from './pages/Cart';
import { Checkout } from './pages/Checkout';
import { OrderConfirmation } from './pages/OrderConfirmation';
import { OrderHistory } from './pages/OrderHistory';
import { Profile } from './pages/Profile';

export const EcommerceApp = () => (
  <CartProvider>
    <QALayout
      showDataTabs={false}
      dockerLab={{
        name: 'OrderFlow API',
        port: 4000,
        bugCount: 19,
        composeUrl: `${import.meta.env.BASE_URL}labs/ecommerce-docker-compose.yml`,
      }}
    >
      <Routes>
        <Route path="/" element={<Storefront />} />
        <Route path="product/:id" element={<ProductDetail />} />
        <Route path="cart" element={<Cart />} />
        <Route path="checkout" element={<Checkout />} />
        <Route path="confirmation/:orderId" element={<OrderConfirmation />} />
        <Route path="orders" element={<OrderHistory />} />
        <Route path="profile" element={<Profile />} />
      </Routes>
    </QALayout>
  </CartProvider>
);
