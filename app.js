const STORAGE_KEYS = {
  transactions: "portfolio.transactions",
  prices: "portfolio.prices",
  settings: "portfolio.settings"
};

const DEFAULT_SUPABASE_PUBLIC_CONFIG = {
  url: "https://xpsdabcwtspiduindexy.supabase.co",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhwc2RhYmN3dHNwaWR1aW5kZXh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwNjAzMzAsImV4cCI6MjA4NzYzNjMzMH0.9k-12l6PnVJNiicYIMh3VQ1uo7ufZZVO8caKqDx-czI"
};

const DEFAULT_FX_TO_USD = {
  USD: 1,
  EUR: 1.08,
  NGN: 0.00066,
  GHS: 0.075
};

const CRYPTO_CATALOG = [
  ["BTC", "Bitcoin", "bitcoin"],
  ["ETH", "Ethereum", "ethereum"],
  ["ZEC", "Zcash", "zcash"],
  ["USDT", "Tether", "tether"],
  ["BNB", "BNB", "binancecoin"],
  ["SOL", "Solana", "solana"],
  ["XRP", "XRP", "ripple"],
  ["DOGE", "Dogecoin", "dogecoin"]
].map(([symbol, name, coingeckoId]) => ({ symbol, name, coingeckoId, assetClass: "crypto" }));

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
  settings: JSON.parse(localStorage.getItem(STORAGE_KEYS.settings) || '{"displayCurrency":"USD"}'),
  fxToUsd: { ...DEFAULT_FX_TO_USD },
  market: {
    lastSuccessAt: null,
    lastError: null
  },
  backend: {
    client: null,
    enabled: false,
    user: null
  }
};

const currencyPicker = document.getElementById("displayCurrency");
const transactionForm = document.getElementById("transactionForm");
const priceForm = document.getElementById("priceForm");
const txSymbolInput = document.getElementById("txSymbol");
const txSuggestions = document.getElementById("txSymbolSuggestions");
const marketStatus = document.getElementById("marketStatus");
const backendStatus = document.getElementById("backendStatus");
const refreshPricesBtn = document.getElementById("refreshPricesBtn");

currencyPicker.value = state.settings.displayCurrency;
transactionForm.date.value = new Date().toISOString().slice(0, 10);

function saveState() {
  localStorage.setItem(STORAGE_KEYS.transactions, JSON.stringify(state.transactions));
  localStorage.setItem(STORAGE_KEYS.prices, JSON.stringify(state.prices));
  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(state.settings));
}

function convert(value, from, to) {
  const usd = value * (state.fxToUsd[from] || 1);
  return usd / (state.fxToUsd[to] || 1);
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

function setBackendStatus(message, isError = false) {
  backendStatus.textContent = message;
  backendStatus.className = isError ? "negative" : "muted";
}

function setMarketStatus(message, isError = false) {
  marketStatus.textContent = message;
  marketStatus.className = isError ? "negative" : "muted";
}

async function connectBackend() {
  if (!window.supabase?.createClient) {
    setBackendStatus("Supabase SDK failed to load. Running in local-only mode.", true);
    return;
  }

  const client = window.supabase.createClient(DEFAULT_SUPABASE_PUBLIC_CONFIG.url, DEFAULT_SUPABASE_PUBLIC_CONFIG.anonKey);
  state.backend.client = client;

  try {
    // Try anonymous sign-in for user-scoped RLS tables.
    const { data, error } = await client.auth.signInAnonymously();
    if (error) {
      setBackendStatus(`Supabase reachable, anonymous auth unavailable (${error.message}). Local transaction fallback enabled.`);
      state.backend.enabled = false;
      return;
    }

    state.backend.enabled = true;
    state.backend.user = data.user;
    setBackendStatus("Supabase backend connected. DB-backed transactions are active.");
    await loadTransactionsFromBackend();
  } catch (error) {
    state.backend.enabled = false;
    setBackendStatus(`Supabase connect failed: ${String(error.message || error)}. Using local fallback.`, true);
  }
}

async function loadTransactionsFromBackend() {
  if (!state.backend.enabled || !state.backend.client) return;

  const { data: txRows, error } = await state.backend.client
    .from("transactions")
    .select("id, executed_at, tx_type, asset_class, symbol, quantity, price, currency")
    .order("executed_at", { ascending: false });

  if (error) {
    setBackendStatus(`Backend connected but transaction read failed: ${error.message}`, true);
    return;
  }

  state.transactions = (txRows || []).map((row) => ({
    id: row.id,
    date: row.executed_at,
    type: row.tx_type,
    assetClass: row.asset_class,
    symbol: row.symbol,
    quantity: Number(row.quantity),
    price: Number(row.price),
    currency: row.currency
  }));

  saveState();
  render();
}

async function fetchLiveCryptoPrices() {
  const ids = CRYPTO_CATALOG.map((c) => c.coingeckoId).join(",");
  const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&price_change_percentage=24h,7d,30d`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`CoinGecko failed (${res.status})`);
  const rows = await res.json();

  const idToSymbol = Object.fromEntries(CRYPTO_CATALOG.map((c) => [c.coingeckoId, c.symbol]));
  for (const row of rows) {
    const symbol = idToSymbol[row.id];
    if (!symbol) continue;

    state.prices[symbol] = {
      currency: "USD",
      price: Number(row.current_price || 0),
      change24h: Number(row.price_change_percentage_24h_in_currency || 0),
      change7d: Number(row.price_change_percentage_7d_in_currency || 0),
      change30d: Number(row.price_change_percentage_30d_in_currency || 0)
    };
  }
}

async function fetchLiveFxRates() {
  const res = await fetch("https://open.er-api.com/v6/latest/USD");
  if (!res.ok) throw new Error(`FX API failed (${res.status})`);
  const payload = await res.json();
  if (payload.result !== "success" || !payload.rates) throw new Error("FX API returned invalid payload");

  const rates = payload.rates;
  state.fxToUsd.USD = 1;
  for (const cur of ["EUR", "NGN", "GHS"]) {
    if (rates[cur]) state.fxToUsd[cur] = 1 / rates[cur];
  }
}

async function refreshLiveData() {
  refreshPricesBtn.disabled = true;
  setMarketStatus("Refreshing live market prices...");

  try {
    await Promise.all([fetchLiveCryptoPrices(), fetchLiveFxRates()]);
    state.market.lastSuccessAt = new Date().toISOString();
    state.market.lastError = null;
    saveState();
    render();

    const stamp = new Date(state.market.lastSuccessAt).toLocaleString();
    setMarketStatus(`Live data updated via CoinGecko + ExchangeRate API at ${stamp}.`);
  } catch (error) {
    state.market.lastError = String(error.message || error);
    setMarketStatus(`Live refresh failed: ${state.market.lastError}. Using cached/local prices.`, true);
  } finally {
    refreshPricesBtn.disabled = false;
  }
}

function renderSuggestions() {
  const term = txSymbolInput.value.trim().toUpperCase();
  const assetClass = transactionForm.assetClass.value;
  const catalog = getCatalogFor(assetClass);
  const picks = catalog.filter((item) => !term || item.symbol.includes(term) || item.name.toUpperCase().includes(term)).slice(0, 8);

  if (!picks.length || (term && picks.length === 1 && picks[0].symbol === term)) {
    txSuggestions.classList.remove("open");
    txSuggestions.innerHTML = "";
    return;
  }

  txSuggestions.innerHTML = picks
    .map(
      (item) => `<div class="suggestion-item" data-symbol="${item.symbol}">
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
    if (!holdingsMap.has(key)) holdingsMap.set(key, { symbol: key, assetClass: tx.assetClass, qty: 0, costUsd: 0 });

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

    if (tx.assetClass !== "cash") realizedUsd += proceedsUsd - removedCostUsd;
    h.qty -= sellQty;
    h.costUsd -= removedCostUsd;

    if (tx.quantity > sellQty + Number.EPSILON) alert(`Warning: ${h.symbol} sell/withdraw exceeded holdings and was clipped.`);
    if (h.qty < 0.0000001) {
      h.qty = 0;
      h.costUsd = 0;
    }
  }

  return { holdings: [...holdingsMap.values()].filter((h) => h.qty > 0.0000001), realizedUsd };
}

function pricedHolding(holding) {
  const fallbackPriceUsd = holding.qty > 0 ? holding.costUsd / holding.qty : 0;
  const quote = state.prices[holding.symbol] || {
    currency: "USD",
    price: holding.assetClass === "cash" ? 1 : fallbackPriceUsd,
    change24h: 0,
    change7d: 0,
    change30d: 0
  };

  const priceUsd = convert(quote.price, quote.currency, "USD");
  const valueUsd = priceUsd * holding.qty;
  const avgCostUsd = holding.qty ? holding.costUsd / holding.qty : 0;
  return { ...holding, ...quote, valueUsd, avgCostUsd, pnlUsd: valueUsd - holding.costUsd };
}

function renderDashboard(holdings, totals) {
  const displayCurrency = state.settings.displayCurrency;
  const totalUsd = holdings.reduce((sum, h) => sum + h.valueUsd, 0);
  const unrealizedUsd = holdings.reduce((sum, h) => sum + h.pnlUsd, 0);
  const totalPnlUsd = unrealizedUsd + totals.realizedUsd;

  document.getElementById("totalValue").textContent = formatMoney(convert(totalUsd, "USD", displayCurrency), displayCurrency);

  [["totalUnrealized", unrealizedUsd], ["totalRealized", totals.realizedUsd], ["totalPnL", totalPnlUsd]].forEach(([id, usd]) => {
    const val = convert(usd, "USD", displayCurrency);
    const el = document.getElementById(id);
    el.textContent = formatMoney(val, displayCurrency);
    el.className = pctClass(val);
  });

  const weightedChange = (windowKey) => {
    if (!totalUsd) return 0;
    const weighted = holdings.reduce((sum, h) => sum + h.valueUsd * ((h[windowKey] || 0) / 100), 0);
    return (weighted / totalUsd) * 100;
  };

  [["change24h", weightedChange("change24h")], ["change7d", weightedChange("change7d")], ["change30d", weightedChange("change30d")]].forEach(([id, val]) => {
    const el = document.getElementById(id);
    el.textContent = `${val >= 0 ? "+" : ""}${val.toFixed(2)}%`;
    el.className = pctClass(val);
  });
}

function renderHoldings(holdings) {
  const tbody = document.querySelector("#holdingsTable tbody");
  const cur = state.settings.displayCurrency;
  tbody.innerHTML = holdings
    .map((h) => {
      const found = [...CRYPTO_CATALOG, ...STOCK_CATALOG, ...CASH_CATALOG].find((x) => x.symbol === h.symbol);
      const assetClass = found?.assetClass || h.assetClass;
      return `<tr>
        <td><span class="symbol-cell"><img class="asset-icon" src="${iconFor(h.symbol, assetClass)}" alt="${h.symbol} logo" />${h.symbol}</span></td>
        <td>${h.assetClass}</td><td>${h.qty.toFixed(4)}</td>
        <td>${formatMoney(convert(h.avgCostUsd, "USD", cur), cur)}</td>
        <td>${formatMoney(convert(h.valueUsd, "USD", cur), cur)}</td>
        <td class="${pctClass(h.pnlUsd)}">${formatMoney(convert(h.pnlUsd, "USD", cur), cur)}</td>
      </tr>`;
    })
    .join("");
}

function renderTransactions() {
  const tbody = document.querySelector("#transactionsTable tbody");
  tbody.innerHTML = state.transactions
    .map(
      (tx, i) => `<tr>
        <td>${tx.date}</td><td>${tx.type}</td><td>${tx.assetClass}</td>
        <td><span class="symbol-cell"><img class="asset-icon" src="${iconFor(tx.symbol.toUpperCase(), tx.assetClass)}" alt="${tx.symbol} logo" />${tx.symbol.toUpperCase()}</span></td>
        <td>${tx.quantity}</td><td>${tx.price}</td><td>${tx.currency}</td>
        <td><button data-delete="${i}">Delete</button></td>
      </tr>`
    )
    .join("");

  tbody.querySelectorAll("button[data-delete]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const index = Number(btn.dataset.delete);
      const tx = state.transactions[index];
      if (state.backend.enabled && tx.id) {
        const { error } = await state.backend.client.from("transactions").delete().eq("id", tx.id);
        if (error) return alert(`Delete failed: ${error.message}`);
      }
      state.transactions.splice(index, 1);
      saveState();
      render();
    });
  });
}

function renderPrices() {
  const tbody = document.querySelector("#pricesTable tbody");
  tbody.innerHTML = Object.entries(state.prices)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([symbol, p]) => {
      const found = [...CRYPTO_CATALOG, ...STOCK_CATALOG, ...CASH_CATALOG].find((x) => x.symbol === symbol);
      const assetClass = found?.assetClass || "crypto";
      return `<tr>
        <td><span class="symbol-cell"><img class="asset-icon" src="${iconFor(symbol, assetClass)}" alt="${symbol} logo" />${symbol}</span></td>
        <td>${formatMoney(p.price, p.currency)}</td>
        <td class="${pctClass(p.change24h)}">${Number(p.change24h || 0).toFixed(2)}%</td>
        <td class="${pctClass(p.change7d)}">${Number(p.change7d || 0).toFixed(2)}%</td>
        <td class="${pctClass(p.change30d)}">${Number(p.change30d || 0).toFixed(2)}%</td>
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

transactionForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = new FormData(transactionForm);
  const tx = {
    date: String(data.get("date")),
    type: String(data.get("type")),
    assetClass: String(data.get("assetClass")),
    symbol: String(data.get("symbol")).toUpperCase().trim(),
    quantity: Number(data.get("quantity")),
    price: Number(data.get("price")),
    currency: String(data.get("currency"))
  };

  if (state.backend.enabled) {
    const { data: inserted, error } = await state.backend.client
      .from("transactions")
      .insert({
        user_id: state.backend.user.id,
        executed_at: tx.date,
        tx_type: tx.type,
        asset_class: tx.assetClass,
        symbol: tx.symbol,
        quantity: tx.quantity,
        price: tx.price,
        currency: tx.currency
      })
      .select("id")
      .single();

    if (error) {
      alert(`DB save failed, keeping local only: ${error.message}`);
    } else {
      tx.id = inserted.id;
    }
  }

  state.transactions.unshift(tx);
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
    currency: String(data.get("currency")),
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

refreshPricesBtn.addEventListener("click", refreshLiveData);
transactionForm.assetClass.addEventListener("change", renderSuggestions);
txSymbolInput.addEventListener("input", renderSuggestions);
txSymbolInput.addEventListener("focus", renderSuggestions);
document.addEventListener("click", (e) => {
  if (!transactionForm.contains(e.target)) txSuggestions.classList.remove("open");
});

async function bootstrap() {
  await connectBackend();
  render();
  await refreshLiveData();
  setInterval(refreshLiveData, 120000);
}

bootstrap();
