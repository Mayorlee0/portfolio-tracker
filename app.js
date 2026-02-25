const STORAGE_KEYS = {
  transactions: "portfolio.transactions",
  prices: "portfolio.prices",
  settings: "portfolio.settings",
  supabase: "portfolio.supabase"
};

const DEFAULT_FX_TO_USD = {
  USD: 1,
  EUR: 1.08,
  NGN: 0.00066,
  GHS: 0.075
};

const CRYPTO_CATALOG = [
  ["BTC", "Bitcoin"], ["ETH", "Ethereum"], ["ZEC", "Zcash"], ["USDT", "Tether"], ["BNB", "BNB"], ["SOL", "Solana"], ["XRP", "XRP"], ["DOGE", "Dogecoin"]
].map(([symbol, name]) => ({ symbol, name, assetClass: "crypto" }));

const STOCK_CATALOG = [
  ["DANGCEM", "Dangote Cement"], ["MTNN", "MTN Nigeria"], ["GTCO", "Guaranty Trust Holding"], ["AAPL", "Apple"], ["MSFT", "Microsoft"], ["NVDA", "NVIDIA"]
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
  auth: {
    client: null,
    session: null,
    user: null,
    connected: false
  }
};

const currencyPicker = document.getElementById("displayCurrency");
const transactionForm = document.getElementById("transactionForm");
const priceForm = document.getElementById("priceForm");
const txSymbolInput = document.getElementById("txSymbol");
const txSuggestions = document.getElementById("txSymbolSuggestions");
const appMain = document.getElementById("appMain");
const authStatus = document.getElementById("authStatus");
const supabaseConfigForm = document.getElementById("supabaseConfigForm");
const authForm = document.getElementById("authForm");
const signupBtn = document.getElementById("signupBtn");
const logoutBtn = document.getElementById("logoutBtn");

currencyPicker.value = state.settings.displayCurrency;
transactionForm.date.value = new Date().toISOString().slice(0, 10);

function getStoredSupabaseConfig() {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.supabase) || "null");
}

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

function setAuthStatus(message, isError = false) {
  authStatus.textContent = message;
  authStatus.className = isError ? "negative" : "positive";
}

function updateAppVisibility() {
  const allowed = !!state.auth.session;
  appMain.classList.toggle("app-hidden", !allowed);
}

async function createSupabaseClient(url, anonKey) {
  if (!window.supabase?.createClient) {
    setAuthStatus("Supabase JS library failed to load. Check network and refresh.", true);
    return null;
  }
  return window.supabase.createClient(url, anonKey);
}

async function loadProfileAndTransactions() {
  if (!state.auth.client || !state.auth.user) return;

  const { data: profile } = await state.auth.client
    .from("profiles")
    .select("display_currency")
    .eq("user_id", state.auth.user.id)
    .maybeSingle();

  if (profile?.display_currency) {
    state.settings.displayCurrency = profile.display_currency;
    currencyPicker.value = profile.display_currency;
  }

  const { data: txRows, error } = await state.auth.client
    .from("transactions")
    .select("id, executed_at, tx_type, asset_class, symbol, quantity, price, currency")
    .order("executed_at", { ascending: false });

  if (error) {
    setAuthStatus(`Signed in, but failed loading DB transactions: ${error.message}`, true);
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

async function connectSupabase(url, anonKey) {
  const client = await createSupabaseClient(url, anonKey);
  if (!client) return;

  state.auth.client = client;
  state.auth.connected = true;
  localStorage.setItem(STORAGE_KEYS.supabase, JSON.stringify({ url, anonKey }));

  const { data } = await client.auth.getSession();
  state.auth.session = data.session;
  state.auth.user = data.session?.user || null;

  client.auth.onAuthStateChange(async (_event, session) => {
    state.auth.session = session;
    state.auth.user = session?.user || null;
    updateAppVisibility();

    if (session?.user) {
      setAuthStatus(`Connected as ${session.user.email}`);
      await loadProfileAndTransactions();
    } else {
      setAuthStatus("Connected. Sign in to access dashboard.");
    }
  });

  if (state.auth.user) {
    setAuthStatus(`Connected as ${state.auth.user.email}`);
    await loadProfileAndTransactions();
  } else {
    setAuthStatus("Connected. Sign in to access dashboard.");
  }

  updateAppVisibility();
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
      if (state.auth.client && tx.id) {
        const { error } = await state.auth.client.from("transactions").delete().eq("id", tx.id);
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

supabaseConfigForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = new FormData(supabaseConfigForm);
  await connectSupabase(String(data.get("url")).trim(), String(data.get("anonKey")).trim());
});

authForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!state.auth.client) return alert("Connect Supabase first.");
  const data = new FormData(authForm);
  const email = String(data.get("email")).trim();
  const password = String(data.get("password"));
  const { error } = await state.auth.client.auth.signInWithPassword({ email, password });
  if (error) alert(`Sign in failed: ${error.message}`);
});

signupBtn.addEventListener("click", async () => {
  if (!state.auth.client) return alert("Connect Supabase first.");
  const data = new FormData(authForm);
  const email = String(data.get("email")).trim();
  const password = String(data.get("password"));
  const { error } = await state.auth.client.auth.signUp({ email, password });
  if (error) return alert(`Sign up failed: ${error.message}`);
  alert("Sign-up successful. Check your email if confirmation is enabled.");
});

logoutBtn.addEventListener("click", async () => {
  if (!state.auth.client) return;
  await state.auth.client.auth.signOut();
});

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

  if (state.auth.client && state.auth.user) {
    const { data: inserted, error } = await state.auth.client
      .from("transactions")
      .insert({
        user_id: state.auth.user.id,
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

    if (error) return alert(`Save failed: ${error.message}`);
    tx.id = inserted.id;
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

currencyPicker.addEventListener("change", async () => {
  state.settings.displayCurrency = currencyPicker.value;
  saveState();

  if (state.auth.client && state.auth.user) {
    await state.auth.client.from("profiles").upsert({ user_id: state.auth.user.id, display_currency: state.settings.displayCurrency });
  }

  render();
});

transactionForm.assetClass.addEventListener("change", renderSuggestions);
txSymbolInput.addEventListener("input", renderSuggestions);
txSymbolInput.addEventListener("focus", renderSuggestions);
document.addEventListener("click", (e) => {
  if (!transactionForm.contains(e.target)) txSuggestions.classList.remove("open");
});

async function bootstrap() {
  const config = getStoredSupabaseConfig();
  if (config?.url && config?.anonKey) {
    supabaseConfigForm.url.value = config.url;
    supabaseConfigForm.anonKey.value = config.anonKey;
    await connectSupabase(config.url, config.anonKey);
  } else {
    setAuthStatus("Not connected. Add Supabase URL + anon key.", true);
  }

  updateAppVisibility();
  render();
}

bootstrap();
