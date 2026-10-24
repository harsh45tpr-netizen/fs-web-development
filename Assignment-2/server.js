const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'data', 'db.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Helper: Read JSON Database
function readDB() {
  const raw = fs.readFileSync(DB_PATH, 'utf-8');
  return JSON.parse(raw);
}

// Helper: Write JSON Database
function writeDB(data) {
  data.account.updatedAt = new Date().toISOString();
  // Recalculate reserved cash from OPEN BUY limit orders
  const openBuyReserved = data.orders
    .filter((o) => o.status === 'OPEN' && o.side === 'BUY')
    .reduce((sum, o) => sum + o.total, 0);
  data.account.reservedCash = Number(openBuyReserved.toFixed(2));
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

// Helper: Apply a filled order to portfolio & account
function applyFillToPortfolioAndAccount(db, order, fillPrice) {
  const qty = Number(order.quantity);
  const price = Number(fillPrice.toFixed(2));
  const totalCost = Number((qty * price).toFixed(2));

  let holdingIndex = db.portfolio.findIndex((p) => p.symbol === order.symbol);

  if (order.side === 'BUY') {
    db.account.cashBalance = Number((db.account.cashBalance - totalCost).toFixed(2));
    if (holdingIndex > -1) {
      const existing = db.portfolio[holdingIndex];
      const newQty = existing.quantity + qty;
      const newAvgCost = (existing.quantity * existing.avgCost + totalCost) / newQty;
      existing.quantity = Number(newQty.toFixed(4));
      existing.avgCost = Number(newAvgCost.toFixed(2));
    } else {
      db.portfolio.push({
        symbol: order.symbol,
        name: order.name,
        quantity: qty,
        avgCost: price
      });
    }
    order.realizedPnL = null;
  } else if (order.side === 'SELL') {
    const existing = db.portfolio[holdingIndex];
    const costBasis = existing ? existing.avgCost * qty : price * qty;
    const realizedPnL = Number((totalCost - costBasis).toFixed(2));

    db.account.cashBalance = Number((db.account.cashBalance + totalCost).toFixed(2));
    if (existing) {
      existing.quantity = Number((existing.quantity - qty).toFixed(4));
      if (existing.quantity <= 0.0001) {
        db.portfolio.splice(holdingIndex, 1);
      }
    }
    order.realizedPnL = realizedPnL;
  }

  order.executedPrice = price;
  order.total = totalCost;
  order.status = 'FILLED';
  order.executedAt = new Date().toISOString();
}

// GET /api/state - Full Brokerage State from JSON DB
app.get('/api/state', (req, res) => {
  try {
    const db = readDB();
    res.json(db);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read JSON database', details: err.message });
  }
});

// POST /api/orders - Execute Buy / Sell (Market or Limit) Order
app.post('/api/orders', (req, res) => {
  try {
    const { symbol, side, type, quantity, limitPrice, timeInForce = 'DAY' } = req.body;
    const db = readDB();

    const stock = db.stocks.find((s) => s.symbol === symbol);
    if (!stock) {
      return res.status(404).json({ error: `Stock symbol ${symbol} not found.` });
    }

    const cleanSide = String(side || '').toUpperCase();
    const cleanType = String(type || '').toUpperCase();
    const qty = Number(quantity);

    if (!['BUY', 'SELL'].includes(cleanSide)) {
      return res.status(400).json({ error: 'Order side must be BUY or SELL.' });
    }
    if (!['MARKET', 'LIMIT'].includes(cleanType)) {
      return res.status(400).json({ error: 'Order type must be MARKET or LIMIT.' });
    }
    if (!qty || isNaN(qty) || qty <= 0) {
      return res.status(400).json({ error: 'Quantity must be greater than 0.' });
    }

    const parsedLimit = cleanType === 'LIMIT' ? Number(limitPrice) : null;
    if (cleanType === 'LIMIT' && (!parsedLimit || isNaN(parsedLimit) || parsedLimit <= 0)) {
      return res.status(400).json({ error: 'Valid limit price is required for LIMIT orders.' });
    }

    // Calculate available cash or shares
    const openBuyReserved = db.orders
      .filter((o) => o.status === 'OPEN' && o.side === 'BUY')
      .reduce((sum, o) => sum + o.total, 0);
    const availableCash = Number((db.account.cashBalance - openBuyReserved).toFixed(2));

    const holding = db.portfolio.find((p) => p.symbol === symbol);
    const ownedShares = holding ? holding.quantity : 0;
    const openSellReserved = db.orders
      .filter((o) => o.status === 'OPEN' && o.side === 'SELL' && o.symbol === symbol)
      .reduce((sum, o) => sum + o.quantity, 0);
    const availableShares = Number((ownedShares - openSellReserved).toFixed(4));

    // Determine if order fills immediately or stays OPEN
    let fillsImmediately = false;
    let executionPrice = stock.price;

    if (cleanType === 'MARKET') {
      fillsImmediately = true;
      executionPrice = stock.price;
    } else if (cleanType === 'LIMIT') {
      if (cleanSide === 'BUY' && parsedLimit >= stock.price) {
        fillsImmediately = true;
        executionPrice = stock.price; // Best execution at current price
      } else if (cleanSide === 'SELL' && parsedLimit <= stock.price) {
        fillsImmediately = true;
        executionPrice = stock.price; // Best execution at current price
      }
    }

    const orderTargetPrice = fillsImmediately ? executionPrice : parsedLimit;
    const estimatedTotal = Number((qty * orderTargetPrice).toFixed(2));

    // Validate buying power or share ownership
    if (cleanSide === 'BUY' && estimatedTotal > availableCash) {
      return res.status(400).json({
        error: `Insufficient buying power. Required: $${estimatedTotal.toLocaleString()}, Available: $${availableCash.toLocaleString()}`
      });
    }

    if (cleanSide === 'SELL' && qty > availableShares) {
      return res.status(400).json({
        error: `Insufficient shares of ${symbol}. Trying to sell ${qty}, Available: ${availableShares}`
      });
    }

    const nextIdNum =
      db.orders.reduce((max, o) => {
        const num = parseInt(String(o.id).replace('ORD-', ''), 10);
        return !isNaN(num) && num > max ? num : max;
      }, 9000) + 1;

    const newOrder = {
      id: `ORD-${nextIdNum}`,
      symbol: stock.symbol,
      name: stock.name,
      side: cleanSide,
      type: cleanType,
      quantity: qty,
      limitPrice: cleanType === 'LIMIT' ? Number(parsedLimit.toFixed(2)) : null,
      executedPrice: null,
      total: estimatedTotal,
      status: 'OPEN',
      timeInForce: timeInForce === 'GTC' ? 'GTC' : 'DAY',
      realizedPnL: null,
      createdAt: new Date().toISOString(),
      executedAt: null
    };

    if (fillsImmediately) {
      applyFillToPortfolioAndAccount(db, newOrder, executionPrice);
    }

    db.orders.unshift(newOrder);
    writeDB(db);

    res.status(201).json({
      message:
        newOrder.status === 'FILLED'
          ? `${cleanSide} ${qty} ${symbol} @ $${newOrder.executedPrice.toFixed(2)} FILLED`
          : `Limit Order ${cleanSide} ${qty} ${symbol} @ $${newOrder.limitPrice.toFixed(2)} PLACED (OPEN)`,
      order: newOrder,
      state: db
    });
  } catch (err) {
    res.status(500).json({ error: 'Order execution failed', details: err.message });
  }
});

// POST /api/orders/:id/execute - Fill an OPEN Limit Order immediately
app.post('/api/orders/:id/execute', (req, res) => {
  try {
    const { id } = req.params;
    const db = readDB();
    const order = db.orders.find((o) => o.id === id);

    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }
    if (order.status !== 'OPEN') {
      return res.status(400).json({ error: `Order is already ${order.status}.` });
    }

    const fillPrice = order.limitPrice || db.stocks.find((s) => s.symbol === order.symbol)?.price;
    if (order.side === 'BUY' && db.account.cashBalance < order.quantity * fillPrice) {
      return res.status(400).json({ error: 'Insufficient cash balance to fill order.' });
    }
    if (order.side === 'SELL') {
      const holding = db.portfolio.find((p) => p.symbol === order.symbol);
      if (!holding || holding.quantity < order.quantity) {
        return res.status(400).json({ error: 'Insufficient shares to fill sell order.' });
      }
    }

    // Update stock price to match the limit trigger for realism
    const stock = db.stocks.find((s) => s.symbol === order.symbol);
    if (stock) {
      stock.price = Number(fillPrice.toFixed(2));
      if (stock.price > stock.high) stock.high = stock.price;
      if (stock.price < stock.low) stock.low = stock.price;
      stock.history.push(stock.price);
      if (stock.history.length > 24) stock.history.shift();
    }

    applyFillToPortfolioAndAccount(db, order, fillPrice);
    writeDB(db);

    res.json({
      message: `Limit Order ${order.id} (${order.side} ${order.quantity} ${order.symbol} @ $${fillPrice.toFixed(2)}) FILLED`,
      order,
      state: db
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to execute limit order', details: err.message });
  }
});

// POST /api/orders/:id/cancel - Cancel an OPEN Limit Order
app.post('/api/orders/:id/cancel', (req, res) => {
  try {
    const { id } = req.params;
    const db = readDB();
    const order = db.orders.find((o) => o.id === id);

    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }
    if (order.status !== 'OPEN') {
      return res.status(400).json({ error: `Cannot cancel order with status ${order.status}.` });
    }

    order.status = 'CANCELLED';
    writeDB(db);

    res.json({
      message: `Order ${order.id} (${order.side} ${order.quantity} ${order.symbol}) cancelled.`,
      order,
      state: db
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to cancel order', details: err.message });
  }
});

// POST /api/watchlist - Toggle symbol in Watchlist
app.post('/api/watchlist', (req, res) => {
  try {
    const { symbol } = req.body;
    const db = readDB();
    const idx = db.watchlist.indexOf(symbol);
    let added = false;

    if (idx > -1) {
      db.watchlist.splice(idx, 1);
    } else {
      db.watchlist.push(symbol);
      added = true;
    }

    writeDB(db);
    res.json({
      message: added ? `${symbol} added to Watchlist` : `${symbol} removed from Watchlist`,
      watchlist: db.watchlist,
      state: db
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update watchlist', details: err.message });
  }
});

// POST /api/funds - Deposit or Withdraw Cash
app.post('/api/funds', (req, res) => {
  try {
    const { action, amount } = req.body;
    const numAmount = Number(amount);
    if (!numAmount || isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'Please enter a valid positive amount.' });
    }

    const db = readDB();
    const openBuyReserved = db.orders
      .filter((o) => o.status === 'OPEN' && o.side === 'BUY')
      .reduce((sum, o) => sum + o.total, 0);
    const availableCash = Number((db.account.cashBalance - openBuyReserved).toFixed(2));

    if (action === 'WITHDRAW') {
      if (numAmount > availableCash) {
        return res.status(400).json({
          error: `Withdrawal exceeds available unreserved cash ($${availableCash.toLocaleString()}).`
        });
      }
      db.account.cashBalance = Number((db.account.cashBalance - numAmount).toFixed(2));
      db.account.totalDeposited = Number((db.account.totalDeposited - numAmount).toFixed(2));
    } else {
      db.account.cashBalance = Number((db.account.cashBalance + numAmount).toFixed(2));
      db.account.totalDeposited = Number((db.account.totalDeposited + numAmount).toFixed(2));
    }

    writeDB(db);
    res.json({
      message:
        action === 'WITHDRAW'
          ? `Successfully withdrew $${numAmount.toLocaleString()}`
          : `Successfully deposited $${numAmount.toLocaleString()}`,
      state: db
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update funds', details: err.message });
  }
});

// POST /api/market/tick - Simulate realistic market price movement & auto-check open limit orders
app.post('/api/market/tick', (req, res) => {
  try {
    const db = readDB();
    const autoFilledOrders = [];

    db.stocks.forEach((stock) => {
      // Random move between -1.1% and +1.15%
      const deltaPct = (Math.random() - 0.492) * 0.018;
      const newPrice = Math.max(1, Number((stock.price * (1 + deltaPct)).toFixed(2)));
      stock.price = newPrice;
      if (newPrice > stock.high) stock.high = newPrice;
      if (newPrice < stock.low) stock.low = newPrice;
      stock.history.push(newPrice);
      if (stock.history.length > 24) {
        stock.history.shift();
      }
    });

    // Check if any OPEN limit orders should auto-fill
    db.orders.forEach((order) => {
      if (order.status !== 'OPEN' || order.type !== 'LIMIT') return;
      const stock = db.stocks.find((s) => s.symbol === order.symbol);
      if (!stock) return;

      if (order.side === 'BUY' && stock.price <= order.limitPrice) {
        if (db.account.cashBalance >= order.quantity * stock.price) {
          applyFillToPortfolioAndAccount(db, order, stock.price);
          autoFilledOrders.push(order);
        }
      } else if (order.side === 'SELL' && stock.price >= order.limitPrice) {
        const holding = db.portfolio.find((p) => p.symbol === order.symbol);
        if (holding && holding.quantity >= order.quantity) {
          applyFillToPortfolioAndAccount(db, order, stock.price);
          autoFilledOrders.push(order);
        }
      }
    });

    writeDB(db);
    res.json({
      autoFilledOrders,
      state: db
    });
  } catch (err) {
    res.status(500).json({ error: 'Market tick failed', details: err.message });
  }
});

function startServer(port) {
  const server = app.listen(port, () => {
    console.log(`TradePulse Brokerage Server running at http://localhost:${port}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      const nextPort = Number(port) + 1;
      console.warn(`Port ${port} is busy, trying port ${nextPort}...`);
      startServer(nextPort);
    } else {
      throw err;
    }
  });
}

startServer(PORT);

