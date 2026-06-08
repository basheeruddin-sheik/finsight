// Finsight test-data seed — Node 18+ (uses native fetch)
// Usage: TOKEN=<bearer_token> node seed.js
//
// Covers: all transaction types/behaviors, all categories, all payment methods,
// 4 months of history, borrows in all 4 states, investments (profit/loss/break-even),
// family transfers, budgets (over/under/at-limit), manual splits.

const BASE  = 'http://localhost:3000';
const TOKEN = process.env.TOKEN;
if (!TOKEN) { console.error('Set TOKEN env var first:\n  TOKEN=<bearer> node seed.js'); process.exit(1); }

const H = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${TOKEN}` };

async function req(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: H,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${text}`);
  return JSON.parse(text);
}

const post = (path, body) => req('POST', path, body);
const put  = (path)       => req('PUT',  path);

async function seed() {
  // ─── PERSONS ─────────────────────────────────────────────────────────────
  console.log('\n▶ Creating persons...');
  const anitha  = await post('/persons', { name: 'Anitha',  type: 'FAMILY', phone: null });
  const suresh  = await post('/persons', { name: 'Suresh',  type: 'FAMILY', phone: null });
  const karthik = await post('/persons', { name: 'Karthik', type: 'FRIEND', phone: '9876543210' });
  const priya   = await post('/persons', { name: 'Priya',   type: 'FRIEND', phone: '9123456789' });
  const raju    = await post('/persons', { name: 'Raju',    type: 'FRIEND', phone: null });
  const ram     = await post('/persons', { name: 'Ram',     type: 'FRIEND', phone: null });
  console.log('  ✓ 2 family, 4 friends');

  // ─── MARCH 2026 ──────────────────────────────────────────────────────────
  console.log('\n▶ March 2026 (3 months ago)...');

  // Income
  await post('/transactions', { type: 'INCOME', amount: 85000, date: '2026-03-01', paymentMethod: 'BANK_TRANSFER', note: 'March salary' });

  // Expenses — all categories + varied payment methods
  await post('/transactions', { type: 'EXPENSE', amount: 4500,  date: '2026-03-03', paymentMethod: 'GPAY',         category: 'FOOD_DINING',   note: 'Restaurants & Swiggy' });
  await post('/transactions', { type: 'EXPENSE', amount: 3200,  date: '2026-03-06', paymentMethod: 'PHONEPE',      category: 'GROCERIES',     note: 'Big Basket' });
  await post('/transactions', { type: 'EXPENSE', amount: 2800,  date: '2026-03-08', paymentMethod: 'CASH',         category: 'FUEL_TRAVEL',   note: 'Petrol + highway' });
  await post('/transactions', { type: 'EXPENSE', amount: 1500,  date: '2026-03-12', paymentMethod: 'CREDIT_CARD',  category: 'MEDICAL',       note: 'Pharmacy' });
  await post('/transactions', { type: 'EXPENSE', amount: 2000,  date: '2026-03-15', paymentMethod: 'BANK_TRANSFER',category: 'UTILITIES',     note: 'Electricity + water' });
  await post('/transactions', { type: 'EXPENSE', amount: 1800,  date: '2026-03-18', paymentMethod: 'GPAY',         category: 'ENTERTAINMENT', note: 'Movies + OTT' });
  await post('/transactions', { type: 'EXPENSE', amount: 5500,  date: '2026-03-22', paymentMethod: 'CREDIT_CARD',  category: 'SHOPPING',      note: 'Clothes & accessories' });
  await post('/transactions', { type: 'EXPENSE', amount: 1200,  date: '2026-03-25', paymentMethod: 'GPAY',         category: 'SUBSCRIPTIONS', note: 'Netflix + Spotify' });
  await post('/transactions', { type: 'EXPENSE', amount: 900,   date: '2026-03-28', paymentMethod: 'CASH',         category: 'OTHER',         note: 'Miscellaneous' });

  // Investments (buy)
  await post('/transactions', { type: 'INVESTMENT', amount: 15000, date: '2026-03-28', paymentMethod: 'BANK_TRANSFER', category: 'MUTUAL_FUNDS', note: 'SIP — Nifty 50' });
  await post('/transactions', { type: 'INVESTMENT', amount: 10000, date: '2026-03-29', paymentMethod: 'BANK_TRANSFER', category: 'STOCKS',       note: 'Infosys shares' });

  // Family transfer
  await post('/transactions', { type: 'FAMILY_TRANSFER', amount: 5000, date: '2026-03-30', paymentMethod: 'GPAY', personId: anitha.id, note: 'House expenses' });

  // Borrows — 2 loans given this month
  const kLoan1  = await post('/transactions', { type: 'BORROW_GIVEN', amount: 20000, date: '2026-03-15', paymentMethod: 'GPAY',  personId: karthik.id, note: 'Business help' });
  const priyaLoan = await post('/transactions', { type: 'BORROW_GIVEN', amount: 12000, date: '2026-03-20', paymentMethod: 'GPAY',  personId: priya.id,   note: 'Emergency funds' });
  console.log('  ✓ income, expenses (all 9 categories), 2 investments, 1 transfer, 2 borrows given');

  // ─── APRIL 2026 ──────────────────────────────────────────────────────────
  console.log('\n▶ April 2026 (2 months ago)...');

  // Income — salary + freelance (2 income entries for variety)
  await post('/transactions', { type: 'INCOME', amount: 85000, date: '2026-04-01', paymentMethod: 'BANK_TRANSFER', note: 'April salary' });
  await post('/transactions', { type: 'INCOME', amount: 15000, date: '2026-04-10', paymentMethod: 'BANK_TRANSFER', note: 'Freelance project' });

  // Expenses
  await post('/transactions', { type: 'EXPENSE', amount: 5200, date: '2026-04-02', paymentMethod: 'GPAY',         category: 'FOOD_DINING',   note: 'Zomato + dining' });
  await post('/transactions', { type: 'EXPENSE', amount: 2800, date: '2026-04-05', paymentMethod: 'CASH',         category: 'GROCERIES',     note: 'Local market' });
  await post('/transactions', { type: 'EXPENSE', amount: 3500, date: '2026-04-08', paymentMethod: 'PHONEPE',      category: 'FUEL_TRAVEL',   note: 'Fuel + toll' });
  await post('/transactions', { type: 'EXPENSE', amount: 8000, date: '2026-04-12', paymentMethod: 'CREDIT_CARD',  category: 'SHOPPING',      note: 'Amazon sale' });
  await post('/transactions', { type: 'EXPENSE', amount: 2500, date: '2026-04-16', paymentMethod: 'CASH',         category: 'ENTERTAINMENT', note: 'Cricket match tickets' });
  await post('/transactions', { type: 'EXPENSE', amount: 1800, date: '2026-04-20', paymentMethod: 'CREDIT_CARD',  category: 'SUBSCRIPTIONS', note: 'Annual plan' });
  await post('/transactions', { type: 'EXPENSE', amount: 3000, date: '2026-04-24', paymentMethod: 'BANK_TRANSFER',category: 'UTILITIES',     note: 'Broadband + gas' });
  await post('/transactions', { type: 'EXPENSE', amount: 2200, date: '2026-04-27', paymentMethod: 'GPAY',         category: 'MEDICAL',       note: 'Dental clinic' });

  // Investments (buy) — 2 more types
  await post('/transactions', { type: 'INVESTMENT', amount: 8000,  date: '2026-04-25', paymentMethod: 'BANK_TRANSFER', category: 'GOLD',          note: 'Sovereign Gold Bond' });
  await post('/transactions', { type: 'INVESTMENT', amount: 20000, date: '2026-04-28', paymentMethod: 'BANK_TRANSFER', category: 'FIXED_DEPOSIT', note: 'SBI FD 1yr' });

  // Family transfer
  await post('/transactions', { type: 'FAMILY_TRANSFER', amount: 3000, date: '2026-04-30', paymentMethod: 'PHONEPE', personId: suresh.id, note: 'Monthly allowance' });

  // Borrow — Priya partial repayment
  await post('/transactions', { type: 'BORROW_RECEIVED', amount: 5000, date: '2026-04-10', paymentMethod: 'GPAY', personId: priya.id, borrowId: priyaLoan.id, note: 'Partial return' });

  // Borrow — Interest from Karthik on loan 1
  await post('/transactions', { type: 'INTEREST_RECEIVED', amount: 500, date: '2026-04-30', paymentMethod: 'GPAY', personId: karthik.id, borrowId: kLoan1.id, note: 'Monthly interest' });

  // Borrows — 2 more loans given
  const rajuLoan = await post('/transactions', { type: 'BORROW_GIVEN', amount: 8000, date: '2026-04-15', paymentMethod: 'CASH', personId: raju.id, note: 'Wedding gift loan' });
  const ramLoan  = await post('/transactions', { type: 'BORROW_GIVEN', amount: 5000, date: '2026-04-20', paymentMethod: 'GPAY', personId: ram.id,  note: 'Trip money' });
  console.log('  ✓ 2 incomes, expenses, 2 investments (Gold+FD), 1 transfer, partial repay, interest, 2 borrows given');

  // ─── MAY 2026 ────────────────────────────────────────────────────────────
  console.log('\n▶ May 2026 (last month)...');

  await post('/transactions', { type: 'INCOME', amount: 85000, date: '2026-05-01', paymentMethod: 'BANK_TRANSFER', note: 'May salary' });

  await post('/transactions', { type: 'EXPENSE', amount: 6000, date: '2026-05-02', paymentMethod: 'GPAY',         category: 'FOOD_DINING',   note: 'Restaurants + Zomato' });
  await post('/transactions', { type: 'EXPENSE', amount: 3500, date: '2026-05-05', paymentMethod: 'PHONEPE',      category: 'GROCERIES',     note: 'Weekly groceries' });
  await post('/transactions', { type: 'EXPENSE', amount: 2200, date: '2026-05-08', paymentMethod: 'CASH',         category: 'FUEL_TRAVEL',   note: 'Petrol' });
  await post('/transactions', { type: 'EXPENSE', amount: 4500, date: '2026-05-10', paymentMethod: 'CREDIT_CARD',  category: 'MEDICAL',       note: 'Doctor + lab tests' });
  await post('/transactions', { type: 'EXPENSE', amount: 6500, date: '2026-05-14', paymentMethod: 'CREDIT_CARD',  category: 'SHOPPING',      note: 'Flipkart Big Billion' });
  await post('/transactions', { type: 'EXPENSE', amount: 2500, date: '2026-05-18', paymentMethod: 'BANK_TRANSFER',category: 'UTILITIES',     note: 'Bills' });
  await post('/transactions', { type: 'EXPENSE', amount: 1500, date: '2026-05-22', paymentMethod: 'GPAY',         category: 'SUBSCRIPTIONS', note: 'Annual subscriptions' });
  await post('/transactions', { type: 'EXPENSE', amount: 1800, date: '2026-05-26', paymentMethod: 'CASH',         category: 'ENTERTAINMENT', note: 'Weekend outing' });

  // INVESTMENT RETURNS — all 3 cases
  // Case 1: Profit (sold Stocks for 13k, bought at 10k → +3k profit)
  await post('/transactions', { type: 'INVESTMENT_RETURN', amount: 13000, date: '2026-05-10', paymentMethod: 'BANK_TRANSFER', category: 'STOCKS',      costBasis: 10000, note: 'Infosys sold — ₹3000 profit' });
  // Case 2: Loss (SIP redeemed for 12k, bought at 15k → -3k loss)
  await post('/transactions', { type: 'INVESTMENT_RETURN', amount: 12000, date: '2026-05-20', paymentMethod: 'BANK_TRANSFER', category: 'MUTUAL_FUNDS', costBasis: 15000, note: 'SIP redeemed — ₹3000 loss' });

  // New buy
  await post('/transactions', { type: 'INVESTMENT', amount: 5000, date: '2026-05-25', paymentMethod: 'BANK_TRANSFER', category: 'STOCKS', note: 'HDFC Bank shares' });

  // Family transfer
  await post('/transactions', { type: 'FAMILY_TRANSFER', amount: 8000, date: '2026-05-31', paymentMethod: 'BANK_TRANSFER', personId: anitha.id, note: 'Rent share' });

  // Borrow repayments
  await post('/transactions', { type: 'BORROW_RECEIVED', amount: 8000, date: '2026-05-15', paymentMethod: 'CASH', personId: raju.id, borrowId: rajuLoan.id, note: 'Full repayment' });
  await post('/transactions', { type: 'BORROW_RECEIVED', amount: 3000, date: '2026-05-20', paymentMethod: 'GPAY', personId: priya.id, borrowId: priyaLoan.id, note: 'Another partial' });
  console.log('  ✓ income, expenses, 2 investment returns (profit+loss), new buy, transfer, repayments');

  // ─── JUNE 2026 (current month) ────────────────────────────────────────────
  console.log('\n▶ June 2026 (current month)...');

  await post('/transactions', { type: 'INCOME', amount: 90000, date: '2026-06-01', paymentMethod: 'BANK_TRANSFER', note: 'June salary (hike)' });
  await post('/transactions', { type: 'INCOME', amount: 10000, date: '2026-06-05', paymentMethod: 'BANK_TRANSFER', note: 'Performance bonus' });

  await post('/transactions', { type: 'EXPENSE', amount: 5500, date: '2026-06-02', paymentMethod: 'GPAY',         category: 'FOOD_DINING',   note: 'Dining out' });
  await post('/transactions', { type: 'EXPENSE', amount: 4000, date: '2026-06-03', paymentMethod: 'PHONEPE',      category: 'GROCERIES',     note: 'Big Basket' });
  await post('/transactions', { type: 'EXPENSE', amount: 3500, date: '2026-06-03', paymentMethod: 'CREDIT_CARD',  category: 'ENTERTAINMENT', note: 'Concert tickets' });
  await post('/transactions', { type: 'EXPENSE', amount: 2000, date: '2026-06-04', paymentMethod: 'GPAY',         category: 'MEDICAL',       note: 'Medicines' });
  await post('/transactions', { type: 'EXPENSE', amount: 3000, date: '2026-06-05', paymentMethod: 'CASH',         category: 'FUEL_TRAVEL',   note: 'Petrol + Ola' });
  await post('/transactions', { type: 'EXPENSE', amount: 12000, date: '2026-06-06', paymentMethod: 'CREDIT_CARD', category: 'SHOPPING',      note: 'Electronics' });
  await post('/transactions', { type: 'EXPENSE', amount: 1800, date: '2026-06-07', paymentMethod: 'PAYTM',        category: 'SUBSCRIPTIONS', note: 'Cloud storage + streaming' });
  await post('/transactions', { type: 'EXPENSE', amount: 2200, date: '2026-06-08', paymentMethod: 'BANK_TRANSFER',category: 'UTILITIES',     note: 'Electricity bill' });

  // Investments
  await post('/transactions', { type: 'INVESTMENT', amount: 10000, date: '2026-06-03', paymentMethod: 'BANK_TRANSFER', category: 'GOLD', note: 'Gold ETF' });

  // INVESTMENT RETURNS — 2 more cases in current month
  // Case 3: Break-even (sold Gold 8k, bought 8k → 0 profit)
  await post('/transactions', { type: 'INVESTMENT_RETURN', amount: 8000, date: '2026-06-04', paymentMethod: 'BANK_TRANSFER', category: 'GOLD',   costBasis: 8000, note: 'Gold Bond redeemed — break even' });
  // Case 4: Profit again (HDFC sold 6.5k, bought 5k → +1.5k)
  await post('/transactions', { type: 'INVESTMENT_RETURN', amount: 6500, date: '2026-06-07', paymentMethod: 'BANK_TRANSFER', category: 'STOCKS', costBasis: 5000, note: 'HDFC sold — ₹1500 profit' });

  // Family transfer
  await post('/transactions', { type: 'FAMILY_TRANSFER', amount: 5000, date: '2026-06-05', paymentMethod: 'GPAY', personId: suresh.id, note: 'Monthly support' });

  // Karthik second loan (active)
  const kLoan2 = await post('/transactions', { type: 'BORROW_GIVEN', amount: 10000, date: '2026-06-02', paymentMethod: 'GPAY', personId: karthik.id, note: 'Laptop help' });
  console.log('  ✓ 2 incomes (salary+bonus), expenses, investment buy, 2 returns (break-even+profit), transfer, 1 borrow');

  // ─── SETTLE BORROWS ───────────────────────────────────────────────────────
  console.log('\n▶ Settling borrows...');

  // Raju — fully repaid 8000 in May → settle (no writeoff, just marks closed)
  await put(`/borrows/${rajuLoan.id}/settle`);
  console.log(`  ✓ Raju loan settled (fully repaid — no writeoff)`);

  // Ram — paid nothing → settle writes off full 5000
  await put(`/borrows/${ramLoan.id}/settle`);
  console.log(`  ✓ Ram loan settled (5000 written off as loss)`);

  // Result: Karthik → ACTIVE (2 open loans, 1 interest paid)
  //         Priya   → PARTIALLY_RETURNED (12000 given, 8000 returned, 4000 outstanding)
  //         Raju    → SETTLED (fully repaid)
  //         Ram     → SETTLED + WRITEOFF

  // ─── SPLITS ───────────────────────────────────────────────────────────────
  console.log('\n▶ Creating manual splits...');
  await post('/splits/manual', { personId: priya.id,   balance:  1500 });  // Priya owes me ₹1500
  await post('/splits/manual', { personId: karthik.id, balance: -800  });  // I owe Karthik ₹800 (from trip)
  await post('/splits/manual', { personId: raju.id,    balance:  2200 });  // Raju owes me ₹2200 (shared dinner)
  console.log('  ✓ 3 split balances (positive, negative, positive)');

  // ─── BUDGETS ─────────────────────────────────────────────────────────────
  console.log('\n▶ Creating budgets...');

  // June budgets — mix of over/under/at-limit
  // FOOD_DINING: limit 5000, spending 5500 → OVER (by 500)
  await post('/budgets', { category: 'FOOD_DINING',   month: '2026-06', monthlyLimit: 5000  });
  // GROCERIES: limit 6000, spending 4000 → under (67%)
  await post('/budgets', { category: 'GROCERIES',     month: '2026-06', monthlyLimit: 6000  });
  // SHOPPING: limit 10000, spending 12000 → OVER (by 2000)
  await post('/budgets', { category: 'SHOPPING',      month: '2026-06', monthlyLimit: 10000 });
  // FUEL_TRAVEL: limit 4000, spending 3000 → under (75%)
  await post('/budgets', { category: 'FUEL_TRAVEL',   month: '2026-06', monthlyLimit: 4000  });
  // ENTERTAINMENT: limit 3000, spending 3500 → OVER (by 500)
  await post('/budgets', { category: 'ENTERTAINMENT', month: '2026-06', monthlyLimit: 3000  });
  // MEDICAL: limit 3000, spending 2000 → under (67%)
  await post('/budgets', { category: 'MEDICAL',       month: '2026-06', monthlyLimit: 3000  });

  // May budgets — for historical view
  // FOOD_DINING: limit 6000, spending 6000 → AT LIMIT (100%)
  await post('/budgets', { category: 'FOOD_DINING',   month: '2026-05', monthlyLimit: 6000  });
  // SHOPPING: limit 7000, spending 6500 → just under (93%)
  await post('/budgets', { category: 'SHOPPING',      month: '2026-05', monthlyLimit: 7000  });
  // MEDICAL: limit 3000, spending 4500 → OVER (150%)
  await post('/budgets', { category: 'MEDICAL',       month: '2026-05', monthlyLimit: 3000  });
  console.log('  ✓ June: 3 over-budget, 3 under — May: 1 at-limit, 1 under, 1 over');

  // ─── SUMMARY ─────────────────────────────────────────────────────────────
  console.log('\n✅ Seed complete!\n');
  console.log('What to verify:');
  console.log('  Home       → AllocationBar splits correctly; Invested net uses cost basis');
  console.log('  Borrows    → Karthik ACTIVE×2, Priya PARTIAL, Raju SETTLED, Ram WRITEOFF');
  console.log('  Investments→ May: profit (Stocks +3k) + loss (MF -3k) | Jun: break-even + profit');
  console.log('  Budgets    → Jun: Food/Shopping/Entertainment over; May: Medical over');
  console.log('  Splits     → Priya +1500, Karthik -800, Raju +2200');
  console.log('  Reports    → 4 months of data: Mar/Apr/May/Jun');
  console.log('  Filters    → all 9 categories, all 7 payment methods, all type behaviors');
}

seed().catch(e => { console.error('\n✗ Seed failed:', e.message); process.exit(1); });
