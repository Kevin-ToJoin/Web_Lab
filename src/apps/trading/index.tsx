import { Routes, Route } from 'react-router-dom';
import { QALayout } from '../../qa/QALayout';
import { TradingProvider } from './context/TradingContext';
import { Trade } from './pages/Trade';
import { Watchlist } from './pages/Watchlist';
import { Orders } from './pages/Orders';
import { Portfolio } from './pages/Portfolio';
import { History } from './pages/History';

export const TradingApp = () => (
  <TradingProvider>
    <QALayout>
      <Routes>
        <Route path="/" element={<Trade />} />
        <Route path="watchlist" element={<Watchlist />} />
        <Route path="orders" element={<Orders />} />
        <Route path="portfolio" element={<Portfolio />} />
        <Route path="history" element={<History />} />
      </Routes>
    </QALayout>
  </TradingProvider>
);
