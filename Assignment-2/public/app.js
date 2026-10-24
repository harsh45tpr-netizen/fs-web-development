// TradePulse — Vanilla JS Frontend Client connected to Node.js + JSON Database
const state = {
  db: null,
  selectedSymbol: 'NVDA',
  marketFilter: 'ALL',
  searchQuery: '',
  timeframe: '1D',
  orderSide: 'BUY',
  orderType: 'MARKET',
  fundAction: 'DEPOSIT',
  liveFeedEnabled: true,
  liveTimer: null,
  hoverIndex: null
};

// Format currency
function fmtUSD(val, decimals = 2) {
  const num = Number(val || 0);
  const sign = num < 0 ? '-' : '';
  return `${sign}$${Math.abs(num).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })}`;
}

// Show Toast notification
function showToast(message, isError = false) {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${isError ? 'error' : ''}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.25s';
    setTimeout(() => toast.remove(), 260);
  }, 3600);
}

// Fetch initial state from Express JSON DB API
async function fetchBrokerageState() {
  try {
    const res = await fetch('/api/state');
    const data = await res.json();
    state.db = data;
    renderAll();
  } catch (err) {
    showToast('Failed to connect to Node.js server', true);
  }
}

// Helper: Get currently active stock object
function getActiveStock() {
  if (!state.db || !state.db.stocks) return null;
  return (
    state.db.stocks.find((s) => s.symbol === state.selectedSymbol) ||
    state.db.stocks[0]
  );
}

// Helper: Calculate available cash and available shares
function getAvailability(symbol) {
  if (!state.db) return { availableCash: 0, availableShares: 0, ownedShares: 0 };
  const reservedCash = state.db.orders
    .filter((o) => o.status === 'OPEN' && o.side === 'BUY')
    .reduce((sum, o) => sum + o.total, 0);
  const availableCash = Math.max(0, Number((state.db.account.cashBalance - reservedCash).toFixed(2)));

  const holding = state.db.portfolio.find((p) => p.symbol === symbol);
  const ownedShares = holding ? holding.quantity : 0;
  const reservedShares = state.db.orders
    .filter((o) => o.status === 'OPEN' && o.side === 'SELL' && o.symbol === symbol)
    .reduce((sum, o) => sum + o.quantity, 0);
  const availableShares = Math.max(0, Number((ownedShares - reservedShares).toFixed(4)));

  return { availableCash, availableShares, ownedShares, holding };
}

// Render entire UI
function renderAll() {
  if (!state.db) return;
  renderTopMetrics();
  renderStockList();
  renderActiveInstrument();
  renderChart();
  renderBlotterTables();
  renderOrderTicket();
  updateJsonModalIfOpen();
}

// 1. Render Topbar Account Telemetry
function renderTopMetrics() {
  const { account, portfolio, stocks } = state.db;
  let portfolioValue = 0;
  let totalCostBasis = 0;

  portfolio.forEach((pos) => {
    const st = stocks.find((s) => s.symbol === pos.symbol);
    const price = st ? st.price : pos.avgCost;
    portfolioValue += pos.quantity * price;
    totalCostBasis += pos.quantity * pos.avgCost;
  });

  const netAccountValue = account.cashBalance + portfolioValue;
  const { availableCash } = getAvailability(state.selectedSymbol);
  const unrealizedPnL = portfolioValue - totalCostBasis;
  const unrealizedPct = totalCostBasis > 0 ? (unrealizedPnL / totalCostBasis) * 100 : 0;

  document.getElementById('navNetValue').textContent = fmtUSD(netAccountValue);
  document.getElementById('navBuyingPower').textContent = fmtUSD(availableCash);

  const pnlEl = document.getElementById('navTotalPnL');
  const sign = unrealizedPnL >= 0 ? '+' : '';
  pnlEl.textContent = `${sign}${fmtUSD(unrealizedPnL)} (${sign}${unrealizedPct.toFixed(2)}%)`;
  pnlEl.className = `metric-value mono ${unrealizedPnL >= 0 ? 'text-green' : 'text-red'}`;
}

// 2. Render Left Market Explorer List
function renderStockList() {
  const container = document.getElementById('stockListContainer');
  const { stocks, watchlist, portfolio } = state.db;
  const q = state.searchQuery.trim().toLowerCase();

  const filtered = stocks.filter((st) => {
    if (state.marketFilter === 'WATCHLIST' && !watchlist.includes(st.symbol)) return false;
    if (state.marketFilter === 'HOLDINGS' && !portfolio.some((p) => p.symbol === st.symbol)) return false;
    if (q && !st.symbol.toLowerCase().includes(q) && !st.name.toLowerCase().includes(q)) return false;
    return true;
  });

  document.getElementById('stockCountBadge').textContent = `${filtered.length} Stocks`;

  container.innerHTML = filtered
    .map((st) => {
      const chg = st.price - st.prevClose;
      const pct = (chg / st.prevClose) * 100;
      const isUp = chg >= 0;
      const isActive = st.symbol === state.selectedSymbol;
      const pos = portfolio.find((p) => p.symbol === st.symbol);

      return `
        <div class="stock-item ${isActive ? 'active' : ''}" data-symbol="${st.symbol}">
          <div class="stock-meta">
            <div class="stock-sym-line">
              <span class="stock-sym mono">${st.symbol}</span>
              ${pos ? `<span class="pos-mini-tag mono">${pos.quantity} sh</span>` : ''}
            </div>
            <span class="stock-company">${st.name}</span>
          </div>
          <div class="stock-quote">
            <span class="stock-price mono">${fmtUSD(st.price)}</span>
            <span class="stock-pct mono ${isUp ? 'up' : 'down'}">
              ${isUp ? '+' : ''}${pct.toFixed(2)}%
            </span>
          </div>
        </div>
      `;
    })
    .join('');

  container.querySelectorAll('.stock-item').forEach((item) => {
    item.addEventListener('click', () => {
      const sym = item.dataset.symbol;
      selectStock(sym);
    });
  });
}

// Select a stock ticker
function selectStock(symbol) {
  state.selectedSymbol = symbol;
  const st = getActiveStock();
  if (st) {
    document.getElementById('orderLimitPrice').value = st.price.toFixed(2);
  }
  renderAll();
}

// 3. Render Center Active Stock Header & Fundamentals
function renderActiveInstrument() {
  const st = getActiveStock();
  if (!st) return;

  const chg = st.price - st.prevClose;
  const pct = (chg / st.prevClose) * 100;
  const isUp = chg >= 0;
  const inWatchlist = state.db.watchlist.includes(st.symbol);

  document.getElementById('activeSymbol').textContent = st.symbol;
  document.getElementById('activeSector').textContent = st.sector;
  document.getElementById('activeName').textContent = st.name;
  document.getElementById('activePrice').textContent = fmtUSD(st.price);

  const changeEl = document.getElementById('activeChange');
  changeEl.textContent = `${isUp ? '+' : ''}${fmtUSD(chg)} (${isUp ? '+' : ''}${pct.toFixed(2)}%) Today`;
  changeEl.className = `price-change mono ${isUp ? 'text-green' : 'text-red'}`;

  const starBtn = document.getElementById('btnToggleWatchlist');
  starBtn.classList.toggle('active', inWatchlist);

  // Fundamentals
  document.getElementById('statOpen').textContent = fmtUSD(st.open);
  document.getElementById('statHigh').textContent = fmtUSD(st.high);
  document.getElementById('statLow').textContent = fmtUSD(st.low);
  document.getElementById('statPrevClose').textContent = fmtUSD(st.prevClose);
  document.getElementById('statVolume').textContent = st.volume;
  document.getElementById('statMktCap').textContent = st.marketCap;
  document.getElementById('statPE').textContent = st.peRatio;
  document.getElementById('stat52W').textContent = `$${st.week52Low} - $${st.week52High}`;
}

// 4. Render Interactive HTML5 Canvas Chart
function getChartSeries(stock) {
  const base = [...(stock.history || [stock.prevClose, stock.price])];
  if (state.timeframe === '1D') return base;
  // Synthesize extended series for 1W, 1M, 1Y anchored to current price
  const mult = state.timeframe === '1W' ? 1.03 : state.timeframe === '1M' ? 1.08 : 1.22;
  const count = 24;
  const series = [];
  const startPrice = stock.price / mult;
  for (let i = 0; i < count - 1; i++) {
    const progress = i / (count - 1);
    const wave = Math.sin(i * 0.7) * (stock.price * 0.015);
    series.push(Number((startPrice + (stock.price - startPrice) * progress + wave).toFixed(2)));
  }
  series.push(stock.price);
  return series;
}

function renderChart() {
  const st = getActiveStock();
  const canvas = document.getElementById('priceChart');
  if (!st || !canvas) return;

  const rect = canvas.parentElement.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;

  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const w = rect.width;
  const h = rect.height;
  ctx.clearRect(0, 0, w, h);

  const series = getChartSeries(st);
  const minVal = Math.min(...series) * 0.996;
  const maxVal = Math.max(...series) * 1.004;
  const range = Math.max(0.01, maxVal - minVal);

  const padLeft = 16;
  const padRight = 64;
  const padTop = 20;
  const padBottom = 24;
  const plotW = w - padLeft - padRight;
  const plotH = h - padTop - padBottom;

  const isUp = series[series.length - 1] >= series[0];
  const mainColor = isUp ? '#10b981' : '#f43f5e';

  // Horizontal grid lines & right-axis labels
  ctx.strokeStyle = 'rgba(30, 41, 59, 0.75)';
  ctx.lineWidth = 1;
  ctx.fillStyle = '#64748b';
  ctx.font = '11px "JetBrains Mono", monospace';
  ctx.textAlign = 'left';

  for (let i = 0; i <= 4; i++) {
    const y = padTop + (plotH / 4) * i;
    const priceLabel = maxVal - (range / 4) * i;
    ctx.beginPath();
    ctx.moveTo(padLeft, y);
    ctx.lineTo(w - padRight, y);
    ctx.stroke();
    ctx.fillText(`$${priceLabel.toFixed(2)}`, w - padRight + 6, y + 4);
  }

  // Compute coordinates
  const pts = series.map((val, idx) => {
    const x = padLeft + (idx / Math.max(1, series.length - 1)) * plotW;
    const y = padTop + ((maxVal - val) / range) * plotH;
    return { x, y, val };
  });

  // Area gradient under curve
  const grad = ctx.createLinearGradient(0, padTop, 0, padTop + plotH);
  grad.addColorStop(0, isUp ? 'rgba(16, 185, 129, 0.28)' : 'rgba(244, 63, 94, 0.28)');
  grad.addColorStop(1, 'rgba(16, 185, 129, 0.0)');

  ctx.beginPath();
  ctx.moveTo(pts[0].x, padTop + plotH);
  pts.forEach((p) => ctx.lineTo(p.x, p.y));
  ctx.lineTo(pts[pts.length - 1].x, padTop + plotH);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Main price line
  ctx.beginPath();
  pts.forEach((p, idx) => {
    if (idx === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.strokeStyle = mainColor;
  ctx.lineWidth = 2.4;
  ctx.stroke();

  // Draw Open Limit Order reference line if an OPEN order exists for this stock
  const openLimitOrders = state.db.orders.filter(
    (o) => o.status === 'OPEN' && o.symbol === st.symbol && o.limitPrice
  );
  openLimitOrders.forEach((ord) => {
    if (ord.limitPrice >= minVal && ord.limitPrice <= maxVal) {
      const ly = padTop + ((maxVal - ord.limitPrice) / range) * plotH;
      ctx.save();
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(padLeft, ly);
      ctx.lineTo(w - padRight, ly);
      ctx.stroke();
      ctx.fillStyle = '#f59e0b';
      ctx.fillText(`LIMIT ${ord.side} $${ord.limitPrice.toFixed(2)}`, padLeft + 8, ly - 5);
      ctx.restore();
    }
  });

  // Hover crosshair & point
  if (state.hoverIndex !== null && pts[state.hoverIndex]) {
    const hp = pts[state.hoverIndex];
    ctx.save();
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = '#94a3b8';
    ctx.beginPath();
    ctx.moveTo(hp.x, padTop);
    ctx.lineTo(hp.x, padTop + plotH);
    ctx.stroke();
    ctx.restore();

    ctx.beginPath();
    ctx.arc(hp.x, hp.y, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = mainColor;
    ctx.fill();
    ctx.strokeStyle = '#090d16';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

// 5. Render Bottom Blotter Tables (Holdings, Open Limit Orders, Order History)
function renderBlotterTables() {
  const { portfolio, orders, stocks } = state.db;
  const openOrders = orders.filter((o) => o.status === 'OPEN');

  document.getElementById('badgeHoldings').textContent = portfolio.length;
  document.getElementById('badgeOpenOrders').textContent = openOrders.length;
  document.getElementById('badgeHistory').textContent = orders.length;

  // TAB 1: Portfolio Holdings
  const holdingsBody = document.getElementById('holdingsTableBody');
  if (portfolio.length === 0) {
    holdingsBody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:26px;">No active stock positions. Place a Buy order on the right panel to build your portfolio.</td></tr>`;
  } else {
    holdingsBody.innerHTML = portfolio
      .map((pos) => {
        const st = stocks.find((s) => s.symbol === pos.symbol);
        const curPrice = st ? st.price : pos.avgCost;
        const mktVal = pos.quantity * curPrice;
        const costVal = pos.quantity * pos.avgCost;
        const pnl = mktVal - costVal;
        const pnlPct = costVal > 0 ? (pnl / costVal) * 100 : 0;
        const isUp = pnl >= 0;

        return `
          <tr>
            <td>
              <strong class="mono" style="cursor:pointer;color:var(--cyan)" onclick="selectStock('${pos.symbol}')">${pos.symbol}</strong>
              <div style="font-size:0.7rem;color:var(--text-secondary)">${pos.name}</div>
            </td>
            <td class="num mono">${pos.quantity}</td>
            <td class="num mono">${fmtUSD(pos.avgCost)}</td>
            <td class="num mono">${fmtUSD(curPrice)}</td>
            <td class="num mono"><strong>${fmtUSD(mktVal)}</strong></td>
            <td class="num mono ${isUp ? 'text-green' : 'text-red'}">
              ${isUp ? '+' : ''}${fmtUSD(pnl)} (${isUp ? '+' : ''}${pnlPct.toFixed(2)}%)
            </td>
            <td class="num">
              <button class="table-btn buy" onclick="quickPrepareOrder('${pos.symbol}', 'BUY')">+ Buy</button>
              <button class="table-btn sell" onclick="quickPrepareOrder('${pos.symbol}', 'SELL')">Sell</button>
            </td>
          </tr>
        `;
      })
      .join('');
  }

  // TAB 2: Open Limit Orders
  const openBody = document.getElementById('openOrdersTableBody');
  if (openOrders.length === 0) {
    openBody.innerHTML = `<tr><td colspan="9" style="text-align:center;color:var(--text-muted);padding:26px;">No open limit orders. Switch the Order Ticket to "Limit Order" to place a resting target order.</td></tr>`;
  } else {
    openBody.innerHTML = openOrders
      .map((ord) => {
        const st = stocks.find((s) => s.symbol === ord.symbol);
        const curPrice = st ? st.price : ord.limitPrice;
        const timeStr = new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        return `
          <tr>
            <td class="mono">${ord.id}</td>
            <td class="mono" style="color:var(--text-secondary)">${timeStr} (${ord.timeInForce})</td>
            <td><strong class="mono" style="color:var(--cyan);cursor:pointer" onclick="selectStock('${ord.symbol}')">${ord.symbol}</strong></td>
            <td><span class="badge ${ord.side === 'BUY' ? 'badge-buy' : 'badge-sell'}">${ord.side} ${ord.type}</span></td>
            <td class="num mono">${ord.quantity}</td>
            <td class="num mono"><strong>${fmtUSD(ord.limitPrice)}</strong></td>
            <td class="num mono">${fmtUSD(curPrice)}</td>
            <td class="num mono">${fmtUSD(ord.total)}</td>
            <td class="num">
              <button class="table-btn buy" onclick="executeLimitOrderNow('${ord.id}')" title="Fill this limit order immediately">⚡ Fill Now</button>
              <button class="table-btn sell" onclick="cancelOpenOrder('${ord.id}')">Cancel</button>
            </td>
          </tr>
        `;
      })
      .join('');
  }

  // TAB 3: Full Order History
  const historyBody = document.getElementById('historyTableBody');
  historyBody.innerHTML = orders
    .map((ord) => {
      const dateStr = new Date(ord.executedAt || ord.createdAt).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      const priceToShow = ord.executedPrice || ord.limitPrice || 0;
      const statusClass =
        ord.status === 'FILLED'
          ? 'badge-filled'
          : ord.status === 'OPEN'
          ? 'badge-open'
          : 'badge-cancelled';

      let pnlDisplay = '—';
      let pnlClass = '';
      if (ord.realizedPnL !== null && ord.realizedPnL !== undefined) {
        const pos = ord.realizedPnL >= 0;
        pnlDisplay = `${pos ? '+' : ''}${fmtUSD(ord.realizedPnL)}`;
        pnlClass = pos ? 'text-green' : 'text-red';
      }

      return `
        <tr>
          <td class="mono">${ord.id}</td>
          <td class="mono" style="color:var(--text-secondary)">${dateStr}</td>
          <td><strong class="mono">${ord.symbol}</strong></td>
          <td><span class="badge ${ord.side === 'BUY' ? 'badge-buy' : 'badge-sell'}">${ord.side}</span></td>
          <td class="mono">${ord.type}</td>
          <td class="num mono">${ord.quantity}</td>
          <td class="num mono">${fmtUSD(priceToShow)}</td>
          <td class="num mono"><strong>${fmtUSD(ord.total)}</strong></td>
          <td class="num mono ${pnlClass}">${pnlDisplay}</td>
          <td><span class="badge ${statusClass}">${ord.status}</span></td>
        </tr>
      `;
    })
    .join('');
}

// 6. Render Right-Column Order Execution Ticket
function renderOrderTicket() {
  const st = getActiveStock();
  if (!st) return;

  const { availableCash, availableShares, ownedShares, holding } = getAvailability(st.symbol);

  document.getElementById('ticketSymbolBadge').textContent = st.symbol;
  document.getElementById('posSymbol').textContent = st.symbol;
  document.getElementById('posShares').textContent = `${ownedShares} Shares`;

  if (holding) {
    const pnl = (st.price - holding.avgCost) * holding.quantity;
    const isUp = pnl >= 0;
    document.getElementById('posAvgCost').textContent = `Avg Cost: ${fmtUSD(holding.avgCost)}`;
    const posPnlEl = document.getElementById('posPnL');
    posPnlEl.textContent = `P&L: ${isUp ? '+' : ''}${fmtUSD(pnl)}`;
    posPnlEl.className = `mono ${isUp ? 'text-green' : 'text-red'}`;
  } else {
    document.getElementById('posAvgCost').textContent = 'Avg Cost: —';
    const posPnlEl = document.getElementById('posPnL');
    posPnlEl.textContent = 'No current position';
    posPnlEl.className = 'mono';
  }

  // Toggle active classes
  document.getElementById('btnSideBuy').classList.toggle('active', state.orderSide === 'BUY');
  document.getElementById('btnSideSell').classList.toggle('active', state.orderSide === 'SELL');

  document.querySelectorAll('.type-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.type === state.orderType);
  });

  // Show/hide Limit Price input
  const limitGroup = document.getElementById('limitPriceGroup');
  limitGroup.classList.toggle('hidden', state.orderType !== 'LIMIT');
  document.getElementById('mktPriceRef').textContent = `Mkt: ${fmtUSD(st.price)}`;

  const qtyInput = document.getElementById('orderQty');
  const limitInput = document.getElementById('orderLimitPrice');
  const qty = Math.max(0, Number(qtyInput.value) || 0);
  const limitPrice = Number(limitInput.value) || st.price;

  const effectivePrice = state.orderType === 'MARKET' ? st.price : limitPrice;
  const maxBuyShares = effectivePrice > 0 ? Math.floor(availableCash / effectivePrice) : 0;

  if (state.orderSide === 'BUY') {
    document.getElementById('maxAvailHint').textContent = `Max Buy: ${maxBuyShares} sh`;
    document.getElementById('summaryAvailLabel').textContent = 'Available Buying Power';
    document.getElementById('summaryAvailVal').textContent = fmtUSD(availableCash);
  } else {
    document.getElementById('maxAvailHint').textContent = `Avail to Sell: ${availableShares} sh`;
    document.getElementById('summaryAvailLabel').textContent = 'Available Shares Owned';
    document.getElementById('summaryAvailVal').textContent = `${availableShares} Shares`;
  }

  // Limit behavior hint
  if (state.orderType === 'LIMIT') {
    const hintEl = document.getElementById('limitBehaviorHint');
    if (state.orderSide === 'BUY') {
      if (limitPrice >= st.price) {
        hintEl.textContent = `Limit price ($${limitPrice.toFixed(2)}) ≥ Market ($${st.price.toFixed(2)}): Will fill immediately at best market price ($${st.price.toFixed(2)}).`;
      } else {
        hintEl.textContent = `Resting Limit Buy: Order will stay OPEN in db.json until ${st.symbol} drops to $${limitPrice.toFixed(2)} or you click "Fill Now".`;
      }
    } else {
      if (limitPrice <= st.price) {
        hintEl.textContent = `Limit price ($${limitPrice.toFixed(2)}) ≤ Market ($${st.price.toFixed(2)}): Will fill immediately at market price ($${st.price.toFixed(2)}).`;
      } else {
        hintEl.textContent = `Resting Limit Sell: Order will stay OPEN in db.json until ${st.symbol} rises to $${limitPrice.toFixed(2)} or you click "Fill Now".`;
      }
    }
  }

  // Summary calculation
  document.getElementById('summaryExecMode').textContent =
    state.orderType === 'MARKET' ? 'Instant Market Fill' : 'Limit Price Target';
  document.getElementById('summaryPriceLabel').textContent =
    state.orderType === 'MARKET' ? 'Market Price' : 'Limit Price';
  document.getElementById('summaryPriceVal').textContent = fmtUSD(effectivePrice);
  document.getElementById('summaryTotalVal').textContent = fmtUSD(qty * effectivePrice);

  // Submit Button text & color
  const submitBtn = document.getElementById('btnSubmitOrder');
  submitBtn.className = `btn-submit-order ${state.orderSide === 'BUY' ? 'buy' : 'sell'}`;
  submitBtn.textContent = `Place ${state.orderSide} ${state.orderType === 'MARKET' ? 'Market' : 'Limit'} Order (${st.symbol})`;
}

// Quick prepare order from Holdings table
window.quickPrepareOrder = function (symbol, side) {
  state.selectedSymbol = symbol;
  state.orderSide = side;
  const st = getActiveStock();
  if (st) {
    document.getElementById('orderLimitPrice').value = st.price.toFixed(2);
  }
  if (side === 'SELL') {
    const { availableShares } = getAvailability(symbol);
    document.getElementById('orderQty').value = Math.max(1, availableShares);
  }
  renderAll();
};

// Execute an OPEN limit order immediately
window.executeLimitOrderNow = async function (orderId) {
  try {
    const res = await fetch(`/api/orders/${orderId}/execute`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || 'Could not fill order', true);
      return;
    }
    state.db = data.state;
    renderAll();
    showToast(data.message);
  } catch (err) {
    showToast('Network error executing order', true);
  }
};

// Cancel an OPEN limit order
window.cancelOpenOrder = async function (orderId) {
  try {
    const res = await fetch(`/api/orders/${orderId}/cancel`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || 'Could not cancel order', true);
      return;
    }
    state.db = data.state;
    renderAll();
    showToast(data.message);
  } catch (err) {
    showToast('Network error cancelling order', true);
  }
};

// Trigger a simulated market price tick
async function triggerMarketTick(silent = false) {
  try {
    const res = await fetch('/api/market/tick', { method: 'POST' });
    const data = await res.json();
    if (res.ok) {
      state.db = data.state;
      renderAll();
      if (data.autoFilledOrders && data.autoFilledOrders.length > 0) {
        data.autoFilledOrders.forEach((o) => {
          showToast(`🎯 Limit Order Triggered! ${o.side} ${o.quantity} ${o.symbol} @ $${o.executedPrice.toFixed(2)}`);
        });
      } else if (!silent) {
        showToast('Market prices updated & saved to db.json');
      }
    }
  } catch (err) {
    // ignore background tick error
  }
}

function updateJsonModalIfOpen() {
  const modal = document.getElementById('dbModal');
  if (!modal.classList.contains('hidden') && state.db) {
    document.getElementById('jsonDbViewer').textContent = JSON.stringify(state.db, null, 2);
  }
}

// Set up Event Listeners
function initEventListeners() {
  // Search input
  document.getElementById('stockSearchInput').addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    renderStockList();
  });

  // Market filter pills
  document.querySelectorAll('#marketFilterTabs .filter-pill').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#marketFilterTabs .filter-pill').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.marketFilter = btn.dataset.filter;
      renderStockList();
    });
  });

  // Watchlist star button
  document.getElementById('btnToggleWatchlist').addEventListener('click', async () => {
    const st = getActiveStock();
    if (!st) return;
    const res = await fetch('/api/watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol: st.symbol })
    });
    const data = await res.json();
    if (res.ok) {
      state.db = data.state;
      renderAll();
      showToast(data.message);
    }
  });

  // Timeframe buttons
  document.querySelectorAll('#timeframeButtons .tf-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#timeframeButtons .tf-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.timeframe = btn.dataset.tf;
      renderChart();
    });
  });

  // Canvas chart hover crosshair
  const canvas = document.getElementById('priceChart');
  const tooltip = document.getElementById('chartTooltip');
  canvas.addEventListener('mousemove', (e) => {
    const st = getActiveStock();
    if (!st) return;
    const series = getChartSeries(st);
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const plotW = rect.width - 16 - 64;
    const relX = Math.max(0, Math.min(plotW, x - 16));
    const idx = Math.round((relX / plotW) * (series.length - 1));
    state.hoverIndex = idx;
    tooltip.style.opacity = '1';
    tooltip.textContent = `${st.symbol}: ${fmtUSD(series[idx])} (${state.timeframe} Pt #${idx + 1})`;
    renderChart();
  });
  canvas.addEventListener('mouseleave', () => {
    state.hoverIndex = null;
    tooltip.style.opacity = '0';
    renderChart();
  });
  window.addEventListener('resize', () => renderChart());

  // Bottom Blotter Tabs
  document.querySelectorAll('.blotter-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.blotter-tab').forEach((t) => t.classList.remove('active'));
      document.querySelectorAll('.blotter-content').forEach((c) => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
    });
  });

  // Order Ticket: BUY / SELL toggle
  document.getElementById('btnSideBuy').addEventListener('click', () => {
    state.orderSide = 'BUY';
    renderOrderTicket();
  });
  document.getElementById('btnSideSell').addEventListener('click', () => {
    state.orderSide = 'SELL';
    renderOrderTicket();
  });

  // Order Ticket: MARKET / LIMIT toggle
  document.querySelectorAll('.type-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.orderType = btn.dataset.type;
      const st = getActiveStock();
      if (state.orderType === 'LIMIT' && st) {
        document.getElementById('orderLimitPrice').value = st.price.toFixed(2);
      }
      renderOrderTicket();
    });
  });

  // Quantity & Limit inputs
  document.getElementById('orderQty').addEventListener('input', renderOrderTicket);
  document.getElementById('orderLimitPrice').addEventListener('input', renderOrderTicket);

  // Quick quantity chips
  document.querySelectorAll('.qty-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const st = getActiveStock();
      if (!st) return;
      if (chip.dataset.qty === 'MAX') {
        const { availableCash, availableShares } = getAvailability(st.symbol);
        const effPrice =
          state.orderType === 'MARKET'
            ? st.price
            : Number(document.getElementById('orderLimitPrice').value) || st.price;
        const maxQty =
          state.orderSide === 'BUY' ? Math.max(1, Math.floor(availableCash / effPrice)) : Math.max(1, availableShares);
        document.getElementById('orderQty').value = maxQty;
      } else {
        document.getElementById('orderQty').value = chip.dataset.qty;
      }
      renderOrderTicket();
    });
  });

  // Quick limit price offset chips
  document.querySelectorAll('.limit-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const st = getActiveStock();
      if (!st) return;
      const offset = Number(chip.dataset.offset);
      const newLimit = Number((st.price * (1 + offset)).toFixed(2));
      document.getElementById('orderLimitPrice').value = newLimit.toFixed(2);
      renderOrderTicket();
    });
  });

  // Submit Order Form -> POST /api/orders
  document.getElementById('orderForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const st = getActiveStock();
    if (!st) return;

    const payload = {
      symbol: st.symbol,
      side: state.orderSide,
      type: state.orderType,
      quantity: Number(document.getElementById('orderQty').value),
      limitPrice: state.orderType === 'LIMIT' ? Number(document.getElementById('orderLimitPrice').value) : null,
      timeInForce: document.getElementById('orderTIF').value
    };

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Order rejected', true);
        return;
      }
      state.db = data.state;
      renderAll();
      showToast(`✅ ${data.message}`);
    } catch (err) {
      showToast('Failed to submit order to server', true);
    }
  });

  // Live Feed Toggle & Manual Tick
  document.getElementById('btnStepTick').addEventListener('click', () => triggerMarketTick(false));
  document.getElementById('btnToggleLive').addEventListener('click', () => {
    state.liveFeedEnabled = !state.liveFeedEnabled;
    document.getElementById('liveDot').classList.toggle('paused', !state.liveFeedEnabled);
    document.getElementById('liveLabel').textContent = `Live Feed: ${state.liveFeedEnabled ? 'ON' : 'OFF'}`;
  });

  // Funds Modal
  const fundsModal = document.getElementById('fundsModal');
  document.getElementById('btnOpenFunds').addEventListener('click', () => {
    const { availableCash } = getAvailability(state.selectedSymbol);
    document.getElementById('modalTotalCash').textContent = fmtUSD(state.db.account.cashBalance);
    document.getElementById('modalReservedCash').textContent = fmtUSD(state.db.account.reservedCash);
    document.getElementById('modalAvailCash').textContent = fmtUSD(availableCash);
    fundsModal.classList.remove('hidden');
  });
  document.getElementById('btnCloseFunds').addEventListener('click', () => fundsModal.classList.add('hidden'));

  document.getElementById('btnFundDeposit').addEventListener('click', () => {
    state.fundAction = 'DEPOSIT';
    document.getElementById('btnFundDeposit').classList.add('active');
    document.getElementById('btnFundWithdraw').classList.remove('active');
    const btn = document.getElementById('btnSubmitFunds');
    btn.className = 'btn-submit-order buy';
    btn.textContent = 'Confirm Deposit to JSON DB';
  });
  document.getElementById('btnFundWithdraw').addEventListener('click', () => {
    state.fundAction = 'WITHDRAW';
    document.getElementById('btnFundWithdraw').classList.add('active');
    document.getElementById('btnFundDeposit').classList.remove('active');
    const btn = document.getElementById('btnSubmitFunds');
    btn.className = 'btn-submit-order sell';
    btn.textContent = 'Confirm Withdrawal from JSON DB';
  });

  document.querySelectorAll('.fund-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      document.getElementById('fundAmount').value = chip.dataset.amt;
    });
  });

  document.getElementById('fundsForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const amount = Number(document.getElementById('fundAmount').value);
    const res = await fetch('/api/funds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: state.fundAction, amount })
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || 'Transfer failed', true);
      return;
    }
    state.db = data.state;
    renderAll();
    fundsModal.classList.add('hidden');
    showToast(`💳 ${data.message}`);
  });

  // Live JSON DB Modal
  const dbModal = document.getElementById('dbModal');
  document.getElementById('btnOpenDbModal').addEventListener('click', () => {
    document.getElementById('jsonDbViewer').textContent = JSON.stringify(state.db, null, 2);
    dbModal.classList.remove('hidden');
  });
  document.getElementById('btnCloseDbModal').addEventListener('click', () => dbModal.classList.add('hidden'));

  // Start background live price ticker (every 6 seconds)
  state.liveTimer = setInterval(() => {
    if (state.liveFeedEnabled) {
      triggerMarketTick(true);
    }
  }, 6000);
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  initEventListeners();
  fetchBrokerageState();
});
