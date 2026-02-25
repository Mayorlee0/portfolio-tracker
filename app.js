const STORAGE_KEYS = {
  transactions: "portfolio.transactions",
  prices: "portfolio.prices",
  settings: "portfolio.settings"
};

const FX_TO_USD = {
  USD: 1,
  EUR: 1.08,
  NGN: 0.00066,
  GHS: 0.075
};

const CRYPTO_CATALOG = [
  ["BTC", "Bitcoin"],
  ["ETH", "Ethereum"],
  ["ZEC", "Zcash"],
  ["USDT", "Tether"],
  ["BNB", "BNB"],
  ["SOL", "Solana"],
  ["XRP", "XRP"],
  ["DOGE", "Dogecoin"]
].map(([symbol, name]) => ({ symbol, name, assetClass: "crypto" }));

const STOCK_CATALOG = [
  ["DANGCEM", "Dangote Cement"],
  ["MTNN", "MTN Nigeria"],
  ["GTCO", "Guaranty Trust Holding"],
  ["AAPL", "Apple"],
  ["MSFT", "Microsoft"],
  ["NVDA", "NVIDIA"]
].map(([symbol, name]) => ({ symbol, name, assetClass: "stock" }));

const CASH_CATALOG = ["USD", "EUR", "NGN", "GHS"].map((symbol) => ({ symbol, name: `${symbol} Cash`, assetClass: "cash" }));

const seedPrices = {
  BTC: { currency: "USD", price: 62000, change24h: 1.2, change7d: 3.1, change30d: 7.6 },
  ETH: { currency: "USD", price: 3300, change24h: 0.5, change7d: 1.5, change30d: 9.2 },
  ZEC: { currency: "USD", price: 270, change24h: -0.6, change7d: 2.1, change30d: 4.5 },
  DANGCEM: { currency: "NGN", price: 420, change24h: -0.4, change7d: 0.8, change30d: 2.2 }
};

const state = {
  transactions: JSON.parse(localStorage.getItem(STORAGE_KEYS.transactions) || "[]"),
  prices: JSON.parse(localStorage.getItem(STORAGE_KEYS.prices) || "null") || seedPrices,
  settings: JSON.parse(localStorage.getItem(STORAGE_KEYS.settings) || '{"displayCurrency":"USD"}')
};

const currencyPicker = document.getElementById("displayCurrency");
const transactionForm = document.getElementById("transactionForm");
const priceForm = document.getElementById("priceForm");
const txSymbolInput = document.getElementById("txSymbol");
const txSuggestions = document.getElementById("txSymbolSuggestions");

currencyPicker.value = state.settings.displayCurrency;
transactionForm.date.value = new Date().toISOString().slice(0, 10);

function saveState() {
  localStorage.setItem(STORAGE_KEYS.transactions, JSON.stringify(state.transactions));
  localStorage.setItem(STORAGE_KEYS.prices, JSON.stringify(state.prices));
  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(state.settings));
}

function convert(value, from, to) {
  const usd = value * (FX_TO_USD[from] || 1);
  return usd / (FX_TO_USD[to] || 1);
}

function formatMoney(value, currency) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(value || 0);
}

function pctClass(value) {
  if (value > 0) return "positive";
  if (value < 0) return "negative";
  return "";
}

function iconFor(symbol, assetClass) {
  const bg = assetClass === "crypto" ? "#eaf2ff" : assetClass === "stock" ? "#e8f7ec" : "#fff4e6";
  const fg = assetClass === "crypto" ? "#1b64f0" : assetClass === "stock" ? "#1f8f43" : "#bd6f00";
  const text = symbol.slice(0, 2);
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32'><rect x='0' y='0' width='32' height='32' rx='16' fill='${bg}'/><text x='16' y='21' text-anchor='middle' font-size='12' font-family='Arial' fill='${fg}'>${text}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function getCatalogFor(assetClass) {
  if (assetClass === "crypto") return CRYPTO_CATALOG;
  if (assetClass === "stock") return STOCK_CATALOG;
  return CASH_CATALOG;
}

function renderSuggestions() {
  const term = txSymbolInput.value.trim().toUpperCase();
  const assetClass = transactionForm.assetClass.value;
  const catalog = getCatalogFor(assetClass);
  const picks = catalog
    .filter((item) => !term || item.symbol.includes(term) || item.name.toUpperCase().includes(term))
    .slice(0, 8);

  if (!picks.length || (term && picks.length === 1 && picks[0].symbol === term)) {
    txSuggestions.classList.remove("open");
    txSuggestions.innerHTML = "";
    return;
  }

  txSuggestions.innerHTML = picks
    .map(
      (item) => `
      <div class="suggestion-item" data-symbol="${item.symbol}">
        <img class="asset-icon" src="${iconFor(item.symbol, item.assetClass)}" alt="${item.symbol} logo" />
        <strong>${item.symbol}</strong>
        <small>${item.name}</small>
      </div>`
    )
    .join("");
  txSuggestions.classList.add("open");

  txSuggestions.querySelectorAll(".suggestion-item").forEach((row) => {
    row.addEventListener("click", () => {
      txSymbolInput.value = row.dataset.symbol;
      txSuggestions.classList.remove("open");
      txSuggestions.innerHTML = "";
      txSymbolInput.focus();
    });
  });
}

function aggregatePortfolio() {
  const holdingsMap = new Map();
  let realizedUsd = 0;

  for (const tx of state.transactions) {
    const key = tx.symbol.toUpperCase();
    if (!holdingsMap.has(key)) {
      holdingsMap.set(key, { symbol: key, assetClass: tx.assetClass, qty: 0, costUsd: 0 });
    }

    const h = holdingsMap.get(key);
    const txValueUsd = convert(tx.quantity * tx.price, tx.currency, "USD");

    if (tx.type === "buy" || tx.type === "deposit") {
      h.qty += tx.quantity;
      h.costUsd += txValueUsd;
      continue;
    }

    const sellQty = Math.min(tx.quantity, h.qty);
    const avgCost = h.qty > 0 ? h.costUsd / h.qty : 0;
    const proceedsUsd = convert(sellQty * tx.price, tx.currency, "USD");
    const removedCostUsd = avgCost * sellQty;

    if (tx.assetClass !== "cash") {
      realizedUsd += proceedsUsd - removedCostUsd;
    }

    h.qty -= sellQty;
    h.costUsd -= removedCostUsd;

    if (tx.quantity > sellQty + Number.EPSILON) {
      alert(`Warning: ${h.symbol} sell/withdraw quantity exceeded holdings and was clipped to current balance.`);
    }

    if (h.qty < 0.0000001) {
      h.qty = 0;
      h.costUsd = 0;
    }
  }

  const holdings = [...holdingsMap.values()].filter((h) => h.qty > 0.0000001);
  return { holdings, realizedUsd };
}

function pricedHolding(holding) {
  const fallbackPriceUsd = holding.qty > 0 ? holding.costUsd / holding.qty : 0;
  const quote = state.prices[holding.symbol] || {
    currency: "USD",
    // Key bug fix: when quote is missing (e.g., newly added ZEC), value at average cost instead of zero.
    price: holding.assetClass === "cash" ? 1 : fallbackPriceUsd,
    change24h: 0,
    change7d: 0,
    change30d: 0
  };

  const priceUsd = convert(quote.price, quote.currency, "USD");
  const valueUsd = priceUsd * holding.qty;
  const avgCostUsd = holding.qty ? holding.costUsd / holding.qty : 0;
  const pnlUsd = valueUsd - holding.costUsd;

  return { ...holding, ...quote, priceUsd, valueUsd, avgCostUsd, pnlUsd };
}

function renderDashboard(holdings, totals) {
  const displayCurrency = state.settings.displayCurrency;
  const totalUsd = holdings.reduce((sum, h) => sum + h.valueUsd, 0);
  const unrealizedUsd = holdings.reduce((sum, h) => sum + h.pnlUsd, 0);
  const totalPnlUsd = unrealizedUsd + totals.realizedUsd;

  document.getElementById("totalValue").textContent = formatMoney(convert(totalUsd, "USD", displayCurrency), displayCurrency);

  const metricMap = [
    ["totalUnrealized", unrealizedUsd],
    ["totalRealized", totals.realizedUsd],
    ["totalPnL", totalPnlUsd]
  ];

  for (const [id, usd] of metricMap) {
    const el = document.getElementById(id);
    const value = convert(usd, "USD", displayCurrency);
    el.textContent = formatMoney(value, displayCurrency);
    el.className = pctClass(value);
  }

  const weightedChange = (windowKey) => {
    if (totalUsd === 0) return 0;
    const weighted = holdings.reduce((sum, h) => sum + h.valueUsd * ((h[windowKey] || 0) / 100), 0);
    return (weighted / totalUsd) * 100;
  };

  const keys = [
    ["change24h", weightedChange("change24h")],
    ["change7d", weightedChange("change7d")],
    ["change30d", weightedChange("change30d")]
  ];

  for (const [id, val] of keys) {
    const el = document.getElementById(id);
    el.textContent = `${val >= 0 ? "+" : ""}${val.toFixed(2)}%`;
    el.className = pctClass(val);
  }
}

function renderHoldings(holdings) {
  const tbody = document.querySelector("#holdingsTable tbody");
  const cur = state.settings.displayCurrency;
  tbody.innerHTML = holdings
    .map((h) => {
      const value = convert(h.valueUsd, "USD", cur);
      const avg = convert(h.avgCostUsd, "USD", cur);
      const pnl = convert(h.pnlUsd, "USD", cur);
      return `
      <tr>
        <td><span class="symbol-cell"><img class="asset-icon" src="${iconFor(h.symbol, h.assetClass)}" alt="${h.symbol} logo" />${h.symbol}</span></td>
        <td>${h.assetClass}</td>
        <td>${h.qty.toFixed(4)}</td>
        <td>${formatMoney(avg, cur)}</td>
        <td>${formatMoney(value, cur)}</td>
        <td class="${pctClass(pnl)}">${formatMoney(pnl, cur)}</td>
      </tr>
    `;
    })
    .join("");
}

function renderTransactions() {
  const tbody = document.querySelector("#transactionsTable tbody");
  tbody.innerHTML = state.transactions
    .map(
      (tx, i) => `
      <tr>
        <td>${tx.date}</td>
        <td>${tx.type}</td>
        <td>${tx.assetClass}</td>
        <td><span class="symbol-cell"><img class="asset-icon" src="${iconFor(tx.symbol.toUpperCase(), tx.assetClass)}" alt="${tx.symbol} logo" />${tx.symbol.toUpperCase()}</span></td>
        <td>${tx.quantity}</td>
        <td>${tx.price}</td>
        <td>${tx.currency}</td>
        <td><button data-delete="${i}">Delete</button></td>
      </tr>
    `
    )
    .join("");

  tbody.querySelectorAll("button[data-delete]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.transactions.splice(Number(btn.dataset.delete), 1);
      saveState();
      render();
    });
  });
}

function renderPrices() {
  const tbody = document.querySelector("#pricesTable tbody");
  tbody.innerHTML = Object.entries(state.prices)
    .map(([symbol, p]) => {
      const found = [...CRYPTO_CATALOG, ...STOCK_CATALOG, ...CASH_CATALOG].find((x) => x.symbol === symbol);
      const assetClass = found?.assetClass || "crypto";
      return `<tr>
        <td><span class="symbol-cell"><img class="asset-icon" src="${iconFor(symbol, assetClass)}" alt="${symbol} logo" />${symbol}</span></td>
        <td>${formatMoney(p.price, p.currency)}</td>
        <td class="${pctClass(p.change24h)}">${p.change24h}%</td>
        <td class="${pctClass(p.change7d)}">${p.change7d}%</td>
        <td class="${pctClass(p.change30d)}">${p.change30d}%</td>
      </tr>`;
    })
    .join("");
}

function render() {
  const portfolio = aggregatePortfolio();
  const holdings = portfolio.holdings.map(pricedHolding);
  renderDashboard(holdings, portfolio);
  renderHoldings(holdings);
  renderTransactions();
  renderPrices();
}

transactionForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const data = new FormData(transactionForm);
  state.transactions.unshift({
    date: data.get("date"),
    type: data.get("type"),
    assetClass: data.get("assetClass"),
    symbol: String(data.get("symbol")).toUpperCase().trim(),
    quantity: Number(data.get("quantity")),
    price: Number(data.get("price")),
    currency: data.get("currency")
  });

  saveState();
  transactionForm.reset();
  transactionForm.date.value = new Date().toISOString().slice(0, 10);
  txSuggestions.classList.remove("open");
  txSuggestions.innerHTML = "";
  render();
});

priceForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const data = new FormData(priceForm);
  const symbol = String(data.get("symbol")).toUpperCase().trim();
  state.prices[symbol] = {
    currency: data.get("currency"),
    price: Number(data.get("price")),
    change24h: Number(data.get("change24h")),
    change7d: Number(data.get("change7d")),
    change30d: Number(data.get("change30d"))
  };
  saveState();
  priceForm.reset();
  render();
});

currencyPicker.addEventListener("change", () => {
  state.settings.displayCurrency = currencyPicker.value;
  saveState();
  render();
});

transactionForm.assetClass.addEventListener("change", renderSuggestions);
txSymbolInput.addEventListener("input", renderSuggestions);
txSymbolInput.addEventListener("focus", renderSuggestions);

document.addEventListener("click", (e) => {
  if (!transactionForm.contains(e.target)) {
    txSuggestions.classList.remove("open");
  }
});

render();
