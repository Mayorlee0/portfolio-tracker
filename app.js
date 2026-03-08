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

const seedPrices = {
  BTC: { currency: "USD", price: 62000, change24h: 1.2, change7d: 3.1, change30d: 7.6 },
  ETH: { currency: "USD", price: 3300, change24h: 0.5, change7d: 1.5, change30d: 9.2 },
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

function aggregateHoldings() {
  const map = new Map();

  for (const tx of state.transactions) {
    const key = tx.symbol.toUpperCase();
    if (!map.has(key)) {
      map.set(key, { symbol: key, assetClass: tx.assetClass, qty: 0, costUsd: 0 });
    }

    const h = map.get(key);
    const txValueUsd = convert(tx.quantity * tx.price, tx.currency, "USD");

    if (tx.type === "buy" || tx.type === "deposit") {
      h.qty += tx.quantity;
      h.costUsd += txValueUsd;
    } else {
      const avg = h.qty > 0 ? h.costUsd / h.qty : 0;
      h.qty -= tx.quantity;
      h.costUsd -= avg * tx.quantity;
    }

    if (h.qty < 0) {
      alert(`Warning: ${h.symbol} has negative holdings due to sells/withdrawals above balance.`);
      h.qty = 0;
      h.costUsd = 0;
    }
  }

  return [...map.values()].filter((h) => h.qty > 0.0000001);
}

function pricedHolding(holding) {
  const quote = state.prices[holding.symbol] || {
    currency: "USD",
    price: holding.assetClass === "cash" ? 1 : 0,
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

function renderDashboard(holdings) {
  const displayCurrency = state.settings.displayCurrency;
  const totalUsd = holdings.reduce((sum, h) => sum + h.valueUsd, 0);
  const weightedChange = (windowKey) => {
    if (totalUsd === 0) return 0;
    const weighted = holdings.reduce((sum, h) => sum + h.valueUsd * ((h[windowKey] || 0) / 100), 0);
    return (weighted / totalUsd) * 100;
  };

  const totalDisplay = convert(totalUsd, "USD", displayCurrency);
  document.getElementById("totalValue").textContent = formatMoney(totalDisplay, displayCurrency);

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
        <td>${h.symbol}</td>
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
        <td>${tx.symbol.toUpperCase()}</td>
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
      return `<tr>
        <td>${symbol}</td>
        <td>${formatMoney(p.price, p.currency)}</td>
        <td class="${pctClass(p.change24h)}">${p.change24h}%</td>
        <td class="${pctClass(p.change7d)}">${p.change7d}%</td>
        <td class="${pctClass(p.change30d)}">${p.change30d}%</td>
      </tr>`;
    })
    .join("");
}

function render() {
  const holdings = aggregateHoldings().map(pricedHolding);
  renderDashboard(holdings);
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

render();
