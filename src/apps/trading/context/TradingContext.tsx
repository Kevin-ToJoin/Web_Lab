/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react';

export const INITIAL_CASH = 10000.0;

export interface Holding {
  symbol: string;
  shares: number;
  avgPrice: number;
}

export interface TradeRecord {
  id: string;
  time: string;
  action: 'BUY' | 'SELL';
  symbol: string;
  shares: number;
  price: number;
}

export interface PendingOrder {
  id: string;
  symbol: string;
  shares: number;
  limitPrice: number;
  createdAt: string;
}

export interface WatchlistItem {
  symbol: string;
  alertAbove: number | null;
}

export const TRADABLE = [
  { symbol: 'TECH', name: 'Tech Global Index', price: 150.0 },
  { symbol: 'AERO', name: 'Aerospace Holdings', price: 88.25 },
  { symbol: 'GOLD', name: 'Precious Metals Fund', price: 205.75 },
  { symbol: 'BOND', name: 'Fixed Income Trust', price: 42.1 },
];

// Market hours in US Eastern (9:30 - 16:00). Used by the market-closed check.
export const MARKET_OPEN_HOUR = 9;
export const MARKET_CLOSE_HOUR = 16;

interface TradingState {
  cash: number;
  holdings: Holding[];
  history: TradeRecord[];
  status: string; setStatus: (s: string) => void;
  prices: Record<string, number>;
  pendingOrders: PendingOrder[];
  cancelPendingOrder: (id: string) => void;
  watchlist: WatchlistItem[];
  addToWatchlist: (symbol: string, alertAbove: number | null) => void;
  removeFromWatchlist: (symbol: string) => void;
  isMarketOpen: () => boolean;
  executeBuy: (symbol: string, quantity: string, orderType: 'market' | 'limit', limitPrice: string) => void;
  executeSell: (symbol: string, quantity: string) => void;
}

const TradingContext = createContext<TradingState | undefined>(undefined);

export const TradingProvider = ({ children }: { children: ReactNode }) => {
  const [cash, setCash] = useState(INITIAL_CASH);
  const [holdings, setHoldings] = useState<Holding[]>([
    { symbol: 'TECH', shares: 20, avgPrice: 140.0 },
  ]);
  const [history, setHistory] = useState<TradeRecord[]>([]);
  const [status, setStatus] = useState('');

  // BUG TRD-15: pending limit orders are stored but nothing ever re-checks them
  // against the live ticker to fill them — they just sit forever.
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);

  // BUG TRD-19: watchlist alerts are stored but never compared against live
  // prices — "alertAbove" is decorative.
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([
    { symbol: 'AERO', alertAbove: 95 },
  ]);

  // Simulated live ticker keyed by symbol.
  const [prices, setPrices] = useState<Record<string, number>>(
    Object.fromEntries(TRADABLE.map(t => [t.symbol, t.price]))
  );
  // BUG TRD-05: priceRef snapshot lags the live price; the buy reads this stale ref.
  const priceRef = useRef(prices);
  useEffect(() => {
    // Deliberately delayed sync so a trade can read a stale price.
    const t = setTimeout(() => { priceRef.current = prices; }, 400);
    return () => clearTimeout(t);
  }, [prices]);

  useEffect(() => {
    const interval = setInterval(() => {
      setPrices(prev => {
        const next: Record<string, number> = {};
        for (const k of Object.keys(prev)) {
          const change = (Math.random() - 0.5) * 2;
          next[k] = Math.max(1, prev[k] + change);
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const isMarketOpen = () => {
    // BUG TRD-09: uses the browser's LOCAL hours instead of US Eastern (market) time,
    // so the open/closed check is wrong for any user outside Eastern time.
    const h = new Date().getHours();
    return h >= MARKET_OPEN_HOUR && h < MARKET_CLOSE_HOUR;
  };

  const recordTrade = (rec: Omit<TradeRecord, 'id' | 'time'>) => {
    // BUG TRD-03 / TRD-13: timestamp is built from local wall-clock parts and stored
    // without timezone info, then sorted as a plain string. Across DST boundaries or
    // differing offsets the ordering is wrong.
    const d = new Date();
    const localStamp = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()} ${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}`;
    setHistory(prev => {
      const entry: TradeRecord = { ...rec, id: Math.random().toString(36).slice(2), time: localStamp };
      // BUG TRD-03: lexicographic sort on a non-zero-padded local string mis-orders rows.
      return [entry, ...prev].sort((a, b) => b.time.localeCompare(a.time));
    });
  };

  const executeBuy = async (symbol: string, quantity: string, orderType: 'market' | 'limit', limitPrice: string) => {
    setStatus('');
    // BUG TRD-07: parseFloat accepts fractional shares (e.g. 2.5).
    // BUG TRD-11: a negative quantity is not rejected.
    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty === 0) {
      setStatus('Error: Enter a quantity.');
      return;
    }

    const livePrice = prices[symbol] ?? 0;
    // BUG TRD-05: reads the stale snapshot price rather than the live price.
    const execPrice = orderType === 'limit' ? parseFloat(limitPrice) : (priceRef.current[symbol] ?? livePrice);

    // BUG TRD-14: limit comparison uses a raw float compare with no epsilon tolerance,
    // so an order that should trigger at the limit can mis-fire by a floating-point epsilon.
    if (orderType === 'limit') {
      const lp = parseFloat(limitPrice);
      if (livePrice > lp) {
        // BUG TRD-15: "not reached" silently drops the order instead of queuing it —
        // though the UI text implies it's still working, it's simply gone.
        setPendingOrders(prev => [...prev, { id: Math.random().toString(36).slice(2), symbol, shares: qty, limitPrice: lp, createdAt: new Date().toISOString() }]);
        setStatus(`Limit not reached: market ${livePrice.toFixed(4)} > limit ${lp.toFixed(4)}. Order queued (won't actually fill — see Orders page).`);
        return;
      }
    }

    const cost = qty * execPrice;

    // BUG TRD-08 (TOCTOU): the affordability check reads the `cash` closure value...
    if (cost > cash) {
      setStatus('Error: Insufficient buying power.');
      return;
    }

    // BUG TRD-01 / TRD-12: async gap before applying the trade. Rapid clicks each pass
    // the stale check above, so concurrent orders double-purchase and overspend.
    await new Promise(r => setTimeout(r, 450));

    // BUG TRD-08 / TRD-12: overwrites cash from the stale closure instead of an updater,
    // dropping concurrent debits so buying power is exceeded.
    setCash(cash - cost);

    setHoldings(prev => {
      const existing = prev.find(h => h.symbol === symbol);
      if (existing) {
        const newShares = existing.shares + qty;
        // BUG TRD-02 / TRD-10: weighted average and totals are accumulated as raw floats
        // with no rounding, so cumulative precision drift pollutes avgPrice and value.
        const newAvg = (existing.shares * existing.avgPrice + cost) / newShares;
        return prev.map(h => h.symbol === symbol ? { symbol, shares: newShares, avgPrice: newAvg } : h);
      }
      return [...prev, { symbol, shares: qty, avgPrice: execPrice }];
    });

    recordTrade({ action: 'BUY', symbol, shares: qty, price: execPrice });
    setStatus(`Bought ${qty} ${symbol} @ $${execPrice.toFixed(2)}`);
  };

  const executeSell = async (symbol: string, quantity: string) => {
    setStatus('');
    const qty = parseFloat(quantity);
    if (isNaN(qty)) {
      setStatus('Error: Enter a quantity.');
      return;
    }

    // BUG TRD-11: negative quantity is not blocked here, so a sell of -10 adds shares
    // and credits cash — effectively a buy.
    const existing = holdings.find(h => h.symbol === symbol);
    const execPrice = priceRef.current[symbol] ?? prices[symbol] ?? 0;

    // BUG TRD-04: the "enough shares" check reads the `holdings` closure, then awaits;
    // rapid clicks each pass and oversell beyond the owned amount.
    if (!existing || existing.shares < qty) {
      setStatus('Error: Not enough shares.');
      return;
    }

    await new Promise(r => setTimeout(r, 450));

    const proceeds = qty * execPrice;
    setCash(cash + proceeds); // stale closure compounds the race
    setHoldings(prev => {
      const cur = prev.find(h => h.symbol === symbol);
      if (!cur) return prev;
      const remaining = cur.shares - qty;
      if (remaining <= 0) return prev.filter(h => h.symbol !== symbol);
      return prev.map(h => h.symbol === symbol ? { ...h, shares: remaining } : h);
    });

    recordTrade({ action: 'SELL', symbol, shares: qty, price: execPrice });
    setStatus(`Sold ${qty} ${symbol} @ $${execPrice.toFixed(2)}`);
  };

  // BUG TRD-16: cancel removes the order from local state, but there is no
  // confirmation and — more subtly — nothing ever locked funds for it, so
  // "cancelling" gives a false sense that capital had been reserved.
  const cancelPendingOrder = (id: string) => {
    setPendingOrders(prev => prev.filter(o => o.id !== id));
  };

  const addToWatchlist = (symbol: string, alertAbove: number | null) => {
    // BUG TRD-18: no duplicate check — the same symbol can be watchlisted twice.
    setWatchlist(prev => [...prev, { symbol, alertAbove }]);
  };

  const removeFromWatchlist = (symbol: string) => {
    setWatchlist(prev => prev.filter(w => w.symbol !== symbol));
  };

  return (
    <TradingContext.Provider value={{
      cash, holdings, history, status, setStatus, prices,
      pendingOrders, cancelPendingOrder,
      watchlist, addToWatchlist, removeFromWatchlist,
      isMarketOpen, executeBuy, executeSell,
    }}>
      {children}
    </TradingContext.Provider>
  );
};

export const useTrading = () => {
  const ctx = useContext(TradingContext);
  if (!ctx) throw new Error('useTrading must be used within TradingProvider');
  return ctx;
};
