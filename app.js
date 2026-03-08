const APP_VERSION = "2026.03.08-b";

const STORAGE_KEYS = {
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
  ["BTC", "Bitcoin", "btc-bitcoin", "bitcoin"],
  ["ETH", "Ethereum", "eth-ethereum", "ethereum"],
  ["ZEC", "Zcash", "zec-zcash", "zcash"],
  ["USDT", "Tether", "usdt-tether", "tether"],
  ["BNB", "BNB", "bnb-binance-coin", "binancecoin"],
  ["SOL", "Solana", "sol-solana", "solana"],
  ["XRP", "XRP", "xrp-xrp", "ripple"],
  ["DOGE", "Dogecoin", "doge-dogecoin", "dogecoin"]
].map(([symbol, name, coinPaprikaId, coingeckoId]) => ({ symbol, name, coinPaprikaId, coingeckoId, assetClass: "crypto" }));

const STOCK_CATALOG = [
  ["DANGCEM", "Dangote Cement", "DANGCEM.LG", null, "NGN"],
  ["MTNN", "MTN Nigeria", "MTNN.LG", null, "NGN"],
  ["GTCO", "Guaranty Trust Holding", "GTCO.LG", null, "NGN"],
  ["AAPL", "Apple", "AAPL", "aapl.us", "USD"],
  ["MSFT", "Microsoft", "MSFT", "msft.us", "USD"],
  ["NVDA", "NVIDIA", "NVDA", "nvda.us", "USD"]
].map(([symbol, name, yahooSymbol, stooqSymbol, currency]) => ({ symbol, name, yahooSymbol, stooqSymbol, currency, assetClass: "stock" }));

const CASH_CATALOG = ["USD", "EUR", "NGN", "GHS"].map((symbol) => ({ symbol, name: `${symbol} Cash`, assetClass: "cash" }));

const state = {
  transactions: [],
  prices: {},
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
  },
  ui: {
    window: "24h",
    holdingsFilter: "all"
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
const runtimeDebug = document.getElementById("runtimeDebug");
const currencyPickerBottom = document.getElementById("displayCurrencyBottom");
const windowTabs = document.getElementById("windowTabs");
const holdingsFilterTabs = document.getElementById("holdingsFilterTabs");

currencyPicker.value = state.settings.displayCurrency;
currencyPickerBottom.value = state.settings.displayCurrency;
transactionForm.date.value = new Date().toISOString().slice(0, 10);

function saveSettings() {
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


function updateRuntimeDebug() {
  if (!runtimeDebug) return;
  const mode = state.backend.enabled ? 'DB_CONNECTED' : 'DB_NOT_CONNECTED';
  const refresh = state.market.lastSuccessAt ? new Date(state.market.lastSuccessAt).toLocaleString() : 'never';
  runtimeDebug.textContent = `build=${APP_VERSION} | mode=${mode} | tx=${state.transactions.length} | priced_assets=${Object.keys(state.prices).length} | last_refresh=${refresh}`;
}


async function connectBackend() {
  if (!window.supabase?.createClient) {
    setBackendStatus("Supabase SDK failed to load. Running in local-only mode.", true);
    return;
  }

  const client = window.supabase.createClient(DEFAULT_SUPABASE_PUBLIC_CONFIG.url, DEFAULT_SUPABASE_PUBLIC_CONFIG.anonKey);
  state.backend.client = client;

  try {
    const { data, error } = await client.auth.signInAnonymously();
    if (error) {
      setBackendStatus(`Supabase reachable, but anonymous auth is disabled (${error.message}). Backend writes are blocked until auth is enabled.`, true);
      console.error("[backend] anonymous_disabled", error.message);
      updateRuntimeDebug();
      state.backend.enabled = false;
      return;
    }

    state.backend.enabled = true;
    state.backend.user = data.user;
    setBackendStatus("Supabase backend connected. DB-backed transactions are active.");
    console.info("[backend] connected", { user_id: state.backend.user?.id });
    updateRuntimeDebug();
    await loadTransactionsFromBackend();
  } catch (error) {
    state.backend.enabled = false;
    setBackendStatus(`Supabase connect failed: ${String(error.message || error)}. Backend mode unavailable.`, true);
    console.error("[backend] connect_failed", String(error.message || error));
    updateRuntimeDebug();
  }
}

async function loadTransactionsFromBackend() {
  if (!state.backend.enabled || !state.backend.client) return;

  const { data: txRows, error } = await state.backend.client
    .from("transactions")
    .select("id, executed_at, tx_type, asset_class, symbol, quantity, price, currency")
    .order("executed_at", { ascending: false });

  if (error) {
    const code = String(error.code || "");
    const missingTables = code === "42P01" || /relation .* does not exist/i.test(String(error.message || ""));
    if (missingTables) {
      setBackendStatus("Supabase connected, but DB tables are missing. Run supabase/schema.sql in SQL Editor, then run supabase/verify.sql.", true);
    } else {
      setBackendStatus(`Backend connected but transaction read failed: ${error.message}`, true);
    }
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

  saveSettings();
  render();
  updateRuntimeDebug();
}

async function fetchCryptoViaCoinPaprika() {
  const requests = CRYPTO_CATALOG.map(async (asset) => {
    const url = `https://api.coinpaprika.com/v1/tickers/${asset.coinPaprikaId}?quotes=USD`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`CoinPaprika failed (${res.status})`);
    const payload = await res.json();

    const quote = payload?.quotes?.USD;
    const price = Number(quote?.price || 0);
    if (!Number.isFinite(price) || price <= 0) return;

    state.prices[asset.symbol] = {
      currency: "USD",
      price,
      change24h: Number(quote?.percent_change_24h || 0),
      change7d: Number(quote?.percent_change_7d || 0),
      change30d: Number(quote?.percent_change_30d || 0)
    };
  });

  await Promise.all(requests);
}

async function fetchCryptoViaCoinGeckoFallback() {
  const ids = CRYPTO_CATALOG.map((c) => c.coingeckoId).join(",");
  const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&price_change_percentage=24h,7d,30d`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`CoinGecko fallback failed (${res.status})`);
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

async function fetchLiveCryptoPrices() {
  try {
    await fetchCryptoViaCoinPaprika();
  } catch (coinPaprikaError) {
    console.warn("[market] coinpaprika_failed", String(coinPaprikaError?.message || coinPaprikaError));
    await fetchCryptoViaCoinGeckoFallback();
  }
}

async function getStockRangeChangePct(yahooSymbol, rangeDays) {
  const chartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?range=1mo&interval=1d`;
  const res = await fetch(chartUrl);
  if (!res.ok) return 0;

  const payload = await res.json();
  const closes = payload?.chart?.result?.[0]?.indicators?.quote?.[0]?.close || [];
  const valid = closes.filter((v) => typeof v === "number" && Number.isFinite(v));
  if (valid.length < 2) return 0;

  const end = valid[valid.length - 1];
  const idx = Math.max(0, valid.length - 1 - rangeDays);
  const start = valid[idx] || valid[0];
  if (!start) return 0;
  return ((end - start) / start) * 100;
}

async function fetchStockViaStooq(mapped) {
  if (!mapped.stooqSymbol) return false;
  const source = `https://stooq.com/q/l/?s=${mapped.stooqSymbol}&f=sd2t2ohlcv&h&e=csv`;
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(source)}`;
  const res = await fetch(proxyUrl);
  if (!res.ok) return false;
  const txt = await res.text();
  const lines = txt.trim().split(/\r?\n/);
  if (lines.length < 2) return false;

  const cols = lines[1].split(',');
  if (cols.length < 8 || cols[6] === 'N/D') return false;

  const open = Number(cols[3]);
  const close = Number(cols[6]);
  if (!Number.isFinite(close)) return false;
  const change24h = Number.isFinite(open) && open > 0 ? ((close - open) / open) * 100 : 0;

  state.prices[mapped.symbol] = {
    currency: mapped.currency || 'USD',
    price: close,
    change24h,
    change7d: state.prices[mapped.symbol]?.change7d || 0,
    change30d: state.prices[mapped.symbol]?.change30d || 0
  };
  return true;
}


async function fetchStockViaAlpha(mapped) {
  if (!["AAPL", "MSFT", "NVDA"].includes(mapped.symbol)) return false;
  const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${mapped.symbol}&apikey=demo`;
  const res = await fetch(url);
  if (!res.ok) return false;
  const payload = await res.json();
  const q = payload?.["Global Quote"];
  const price = Number(q?.["05. price"] || 0);
  const changePct = Number(String(q?.["10. change percent"] || "0").replace('%',''));
  if (!Number.isFinite(price) || price <= 0) return false;

  state.prices[mapped.symbol] = {
    currency: mapped.currency || "USD",
    price,
    change24h: Number.isFinite(changePct) ? changePct : 0,
    change7d: state.prices[mapped.symbol]?.change7d || 0,
    change30d: state.prices[mapped.symbol]?.change30d || 0
  };
  return true;
}

async function fetchLiveStockPrices() {
  const yahooSymbols = STOCK_CATALOG.map((s) => s.yahooSymbol).join(",");
  const quoteUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(yahooSymbols)}`;
  const byYahoo = Object.fromEntries(STOCK_CATALOG.map((s) => [s.yahooSymbol, s]));
  let updated = 0;

  try {
    const res = await fetch(quoteUrl);
    if (res.ok) {
      const payload = await res.json();
      const results = payload?.quoteResponse?.result || [];

      await Promise.all(
        results.map(async (row) => {
          const mapped = byYahoo[row.symbol];
          if (!mapped || typeof row.regularMarketPrice !== "number") return;

          const change24h = Number(row.regularMarketChangePercent || 0);
          const change7d = await getStockRangeChangePct(mapped.yahooSymbol, 7);
          const change30d = await getStockRangeChangePct(mapped.yahooSymbol, 30);

          state.prices[mapped.symbol] = {
            currency: row.currency || mapped.currency || "USD",
            price: Number(row.regularMarketPrice),
            change24h,
            change7d,
            change30d
          };
          updated += 1;
        })
      );
    }
  } catch (_error) {
    // fall through to stooq fallback
  }

  const stooqResults = await Promise.all(STOCK_CATALOG.map(fetchStockViaStooq));
  updated += stooqResults.filter(Boolean).length;

  const alphaResults = await Promise.all(STOCK_CATALOG.map(fetchStockViaAlpha));
  updated += alphaResults.filter(Boolean).length;

  if (updated === 0) {
    throw new Error("Stock adapter failed (Yahoo, Stooq, and AlphaVantage fallbacks returned no data)");
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

  const tasks = [
    ["crypto", fetchLiveCryptoPrices],
    ["stocks", fetchLiveStockPrices],
    ["fx", fetchLiveFxRates]
  ];

  const results = await Promise.allSettled(tasks.map(([, fn]) => fn()));
  const failures = results
    .map((r, i) => (r.status === "rejected" ? `${tasks[i][0]}: ${String(r.reason?.message || r.reason)}` : null))
    .filter(Boolean);

  if (failures.length === tasks.length) {
    state.market.lastError = failures.join(" | ");
    setMarketStatus(`Live refresh failed: ${state.market.lastError}. Using cached/local prices.`, true);
    console.warn("[market] refresh_failed", state.market.lastError);
    updateRuntimeDebug();
  } else {
    state.market.lastSuccessAt = new Date().toISOString();
    state.market.lastError = failures.join(" | ") || null;
    saveSettings();
    render();
    const stamp = new Date(state.market.lastSuccessAt).toLocaleString();
    const warnSuffix = failures.length ? ` Partial adapter issues: ${state.market.lastError}` : "";
    setMarketStatus(`Live data updated at ${stamp}.${warnSuffix}`, failures.length > 0);
    console.info("[market] refresh_success", { stamp, failures: failures.length });
    updateRuntimeDebug();
  }

  refreshPricesBtn.disabled = false;
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
  const hasQuote = Boolean(state.prices[holding.symbol]);
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
  return { ...holding, ...quote, valueUsd, avgCostUsd, pnlUsd: valueUsd - holding.costUsd, isEstimated: !hasQuote };
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

  const windowValues = [["change24h", weightedChange("change24h")], ["change7d", weightedChange("change7d")], ["change30d", weightedChange("change30d")]];
  windowValues.forEach(([id, val]) => {
    const el = document.getElementById(id);
    el.textContent = `${val >= 0 ? "+" : ""}${val.toFixed(2)}%`;
    el.className = pctClass(val);
  });

  const selectedMap = { "24h": "change24h", "7d": "change7d", "30d": "change30d" };
  const selectedId = selectedMap[state.ui.window] || "change24h";
  const selectedValue = Number(document.getElementById(selectedId).textContent.replace("%", ""));
  const selectedEl = document.getElementById("selectedWindowChange");
  selectedEl.textContent = document.getElementById(selectedId).textContent;
  selectedEl.className = pctClass(selectedValue);
}

function renderHoldings(holdings) {
  const tbody = document.querySelector("#holdingsTable tbody");
  const cur = state.settings.displayCurrency;
  const visible = holdings.filter((h) => state.ui.holdingsFilter === "all" || h.assetClass === state.ui.holdingsFilter);
  tbody.innerHTML = visible
    .map((h) => {
      const found = [...CRYPTO_CATALOG, ...STOCK_CATALOG, ...CASH_CATALOG].find((x) => x.symbol === h.symbol);
      const assetClass = found?.assetClass || h.assetClass;
      return `<tr>
        <td><span class="symbol-cell"><img class="asset-icon" src="${iconFor(h.symbol, assetClass)}" alt="${h.symbol} logo" />${h.symbol}${h.isEstimated ? `<span class="badge-warning">estimated</span>` : ""}</span></td>
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
      if (!state.backend.enabled || !tx.id) return alert("Backend not connected. Delete is unavailable.");
      const { error } = await state.backend.client.from("transactions").delete().eq("id", tx.id);
      if (error) return alert(`Delete failed: ${error.message}`);
      state.transactions.splice(index, 1);
      saveSettings();
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
      alert(`DB save failed: ${error.message}`);
      return;
    }
    tx.id = inserted.id;
  } else {
    alert("Backend not connected. Transaction was not saved.");
    return;
  }

  state.transactions.unshift(tx);
  saveSettings();
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
  saveSettings();
  priceForm.reset();
  render();
});

function onCurrencyChange(value) {
  state.settings.displayCurrency = value;
  currencyPicker.value = value;
  currencyPickerBottom.value = value;
  saveSettings();
  render();
  updateRuntimeDebug();
}

currencyPicker.addEventListener("change", () => onCurrencyChange(currencyPicker.value));
currencyPickerBottom.addEventListener("change", () => onCurrencyChange(currencyPickerBottom.value));

refreshPricesBtn.addEventListener("click", refreshLiveData);
transactionForm.assetClass.addEventListener("change", renderSuggestions);
txSymbolInput.addEventListener("input", renderSuggestions);
txSymbolInput.addEventListener("focus", renderSuggestions);
document.addEventListener("click", (e) => {
  if (!transactionForm.contains(e.target)) txSuggestions.classList.remove("open");
});


windowTabs.querySelectorAll("button").forEach((btn) => {
  btn.addEventListener("click", () => {
    state.ui.window = btn.dataset.window;
    windowTabs.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b === btn));
    render();
  });
});

holdingsFilterTabs.querySelectorAll("button").forEach((btn) => {
  btn.addEventListener("click", () => {
    state.ui.holdingsFilter = btn.dataset.filter;
    holdingsFilterTabs.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b === btn));
    render();
  });
});

async function bootstrap() {
  await connectBackend();
  console.info("[app] boot", { version: APP_VERSION });
  render();
  updateRuntimeDebug();
  await refreshLiveData();
  setInterval(refreshLiveData, 120000);
}

bootstrap();
