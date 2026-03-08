const assert = require('assert');

function convert(value, from, to, fx) {
  const usd = value * (fx[from] || 1);
  return usd / (fx[to] || 1);
}

function aggregatePortfolio(transactions, fx) {
  const holdingsMap = new Map();
  let realizedUsd = 0;

  for (const tx of transactions) {
    const key = tx.symbol.toUpperCase();
    if (!holdingsMap.has(key)) holdingsMap.set(key, { symbol: key, assetClass: tx.assetClass, qty: 0, costUsd: 0 });
    const h = holdingsMap.get(key);
    const txValueUsd = convert(tx.quantity * tx.price, tx.currency, 'USD', fx);

    if (tx.type === 'buy' || tx.type === 'deposit') {
      h.qty += tx.quantity;
      h.costUsd += txValueUsd;
      continue;
    }

    const sellQty = Math.min(tx.quantity, h.qty);
    const avgCost = h.qty > 0 ? h.costUsd / h.qty : 0;
    const proceedsUsd = convert(sellQty * tx.price, tx.currency, 'USD', fx);
    const removedCostUsd = avgCost * sellQty;
    if (tx.assetClass !== 'cash') realizedUsd += proceedsUsd - removedCostUsd;
    h.qty -= sellQty;
    h.costUsd -= removedCostUsd;
    if (h.qty < 1e-7) {
      h.qty = 0;
      h.costUsd = 0;
    }
  }

  return { holdings: [...holdingsMap.values()].filter((h) => h.qty > 1e-7), realizedUsd };
}

const fx = { USD: 1, NGN: 0.00066, EUR: 1.08, GHS: 0.075 };

// empty portfolio
{
  const p = aggregatePortfolio([], fx);
  assert.equal(p.holdings.length, 0);
  assert.equal(p.realizedUsd, 0);
}

// sell more than holdings should clip and not produce negative qty
{
  const p = aggregatePortfolio([
    { type: 'buy', assetClass: 'crypto', symbol: 'BTC', quantity: 1, price: 100, currency: 'USD' },
    { type: 'sell', assetClass: 'crypto', symbol: 'BTC', quantity: 2, price: 150, currency: 'USD' }
  ], fx);
  assert.equal(p.holdings.length, 0);
  assert.equal(p.realizedUsd, 50);
}

// negative cash via withdraw above deposit should floor at zero
{
  const p = aggregatePortfolio([
    { type: 'deposit', assetClass: 'cash', symbol: 'USD', quantity: 100, price: 1, currency: 'USD' },
    { type: 'withdraw', assetClass: 'cash', symbol: 'USD', quantity: 120, price: 1, currency: 'USD' }
  ], fx);
  assert.equal(p.holdings.length, 0);
}

console.log('portfolio math tests passed');
