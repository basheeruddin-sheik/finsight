// ============================================================
// Finsight — Google Apps Script Backend
// ============================================================
// HOW TO USE:
//   1. Open your Google Spreadsheet → Extensions → Apps Script
//   2. Replace everything in Code.gs with this file
//   3. Select "setupSheets" from the function dropdown → Run
//   4. Deploy → New deployment → Web app → Anyone → Deploy
//   5. Copy the Web App URL into frontend/.env.local as VITE_API_URL
// ============================================================

// ==================== ENTRY POINTS ====================

function doGet(e) {
  try {
    const path = (e.parameter.path || '').trim();
    const result = route('GET', path, e.parameter, null);
    return jsonResponse(result);
  } catch (err) {
    return errorResponse(err.message, 400);
  }
}

function doPost(e) {
  try {
    const path = (e.parameter.path || '').trim();
    const method = (e.parameter.method || 'POST').toUpperCase();
    let body = {};
    if (e.postData && e.postData.contents) {
      try { body = JSON.parse(e.postData.contents); } catch (_) {}
    }
    const result = route(method, path, e.parameter, body);
    return jsonResponse(result);
  } catch (err) {
    return errorResponse(err.message, 400);
  }
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function errorResponse(msg, code) {
  return ContentService
    .createTextOutput(JSON.stringify({ error: msg, statusCode: code || 400 }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ==================== ROUTER ====================

function route(method, path, params, body) {
  const id    = params.id     ? parseInt(params.id)  : null;
  const action = params.action || '';

  // --- Transactions ---
  if (path === 'transactions') {
    if (method === 'GET')    return getTransactions(params);
    if (method === 'POST')   return createTransaction(body);
    if (method === 'PUT'  && id) return updateTransaction(id, body);
    if (method === 'DELETE'&& id) return deleteTransaction(id);
  }
  if (path === 'transactions/summary') return getTransactionSummary(params.month);

  // --- Persons ---
  if (path === 'persons') {
    if (method === 'GET')    return getPersons(params.type);
    if (method === 'POST')   return createPerson(body);
    if (method === 'DELETE' && id) return deletePerson(id);
  }

  // --- Borrows ---
  if (path === 'borrows') {
    if (method === 'GET')    return getBorrows(params.status);
    if (method === 'POST' && !id)  return createBorrow(body);
    if (method === 'POST' && id && action === 'payment') return addBorrowPayment(id, body);
    if (method === 'PUT'  && id && action === 'settle')  return settleBorrow(id);
    if (method === 'DELETE' && id) return deleteBorrow(id);
  }
  if (path === 'borrows/summary') return getBorrowSummary();

  // --- Splits ---
  if (path === 'splits')        { if (method === 'GET')  return getSplits(); }
  if (path === 'splits/manual') { if (method === 'POST') return setManualSplit(body); }

  // --- Budgets ---
  if (path === 'budgets') {
    if (method === 'GET')    return getBudgets(params.month);
    if (method === 'POST')   return createBudget(body);
    if (method === 'PUT'   && id) return updateBudget(id, body);
    if (method === 'DELETE' && id) return deleteBudget(id);
  }

  // --- Reports ---
  if (path === 'reports/monthly')      return getMonthlyBreakdown(params.month);
  if (path === 'reports/savings-rate') return getSavingsRateTrend(parseInt(params.months) || 6);
  if (path === 'reports/money-outside') return getMoneyOutside();

  throw new Error('Unknown path: ' + path + ' [' + method + ']');
}

// ==================== SHEET HELPERS ====================

var HEADERS = {
  Transactions:   ['ID','Type','Amount','Date','Category','PaymentMethod','PersonId','Note','CreatedAt'],
  Persons:        ['ID','Name','Type','Phone','CreatedAt'],
  Borrows:        ['ID','PersonId','Principal','InterestRate','StartDate','Status','CreatedAt'],
  BorrowPayments: ['ID','BorrowId','Amount','Date','Note'],
  SplitBalances:  ['ID','PersonId','Balance','Source','LastSyncedAt'],
  Budgets:        ['ID','Category','MonthlyLimit','Month'],
};

function getSheet(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (HEADERS[name]) {
      sheet.getRange(1, 1, 1, HEADERS[name].length).setValues([HEADERS[name]]);
      sheet.setFrozenRows(1);
    }
  }
  return sheet;
}

// Returns all data rows as objects (row 1 = headers skipped, _row = 1-based sheet row).
function getRows(sheetName) {
  var sheet = getSheet(sheetName);
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  var headers = data[0];
  return data.slice(1).map(function(row, i) {
    var obj = { _row: i + 2 };
    headers.forEach(function(h, j) { obj[h] = row[j]; });
    return obj;
  });
}

function nextId(sheetName) {
  var rows = getRows(sheetName);
  if (rows.length === 0) return 1;
  return Math.max.apply(null, rows.map(function(r) { return parseInt(r.ID) || 0; })) + 1;
}

function appendRow(sheetName, values) {
  getSheet(sheetName).appendRow(values);
}

function updateRowAt(sheetName, rowNum, values) {
  getSheet(sheetName).getRange(rowNum, 1, 1, values.length).setValues([values]);
}

function deleteRowAt(sheetName, rowNum) {
  getSheet(sheetName).deleteRow(rowNum);
}

function findById(sheetName, id) {
  return getRows(sheetName).find(function(r) { return parseInt(r.ID) === parseInt(id); }) || null;
}

function toIso(val) {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString();
  return String(val);
}

function currentMonth() {
  var d = new Date();
  return d.getFullYear() + '-' + pad(d.getMonth() + 1);
}

function pad(n) { return n < 10 ? '0' + n : String(n); }

// ==================== TRANSACTIONS ====================

function fmtTransaction(r, persons) {
  var pid = r.PersonId ? parseInt(r.PersonId) : null;
  var person = pid ? (persons.find(function(p) { return parseInt(p.ID) === pid; }) || null) : null;
  return {
    id: parseInt(r.ID),
    type: r.Type,
    amount: parseFloat(r.Amount) || 0,
    date: toIso(r.Date),
    category: r.Category || null,
    paymentMethod: r.PaymentMethod,
    personId: pid,
    note: r.Note || null,
    createdAt: toIso(r.CreatedAt),
    person: person ? { id: parseInt(person.ID), name: person.Name, type: person.Type } : null,
  };
}

function getTransactions(params) {
  var rows = getRows('Transactions');
  if (params.type)     rows = rows.filter(function(r) { return r.Type === params.type; });
  if (params.category) rows = rows.filter(function(r) { return r.Category === params.category; });
  if (params.search)   rows = rows.filter(function(r) { return String(r.Note || '').toLowerCase().indexOf(params.search.toLowerCase()) !== -1; });
  if (params.from)     rows = rows.filter(function(r) { return toIso(r.Date) >= params.from; });
  if (params.to)       rows = rows.filter(function(r) { var d = toIso(r.Date); return d && d.substring(0,10) <= params.to; });

  var persons = getRows('Persons');
  var result = rows.map(function(r) { return fmtTransaction(r, persons); });
  result.sort(function(a, b) { return b.date > a.date ? 1 : -1; });
  return result;
}

function createTransaction(body) {
  var id  = nextId('Transactions');
  var now = new Date().toISOString();
  appendRow('Transactions', [
    id, body.type, body.amount, body.date,
    body.category || '', body.paymentMethod,
    body.personId || '', body.note || '', now
  ]);
  return fmtTransaction(findById('Transactions', id), getRows('Persons'));
}

function updateTransaction(id, body) {
  var r = findById('Transactions', id);
  if (!r) throw new Error('Transaction not found');
  updateRowAt('Transactions', r._row, [
    id,
    body.type          !== undefined ? body.type          : r.Type,
    body.amount        !== undefined ? body.amount        : r.Amount,
    body.date          !== undefined ? body.date          : r.Date,
    body.category      !== undefined ? (body.category || '') : r.Category,
    body.paymentMethod !== undefined ? body.paymentMethod : r.PaymentMethod,
    body.personId      !== undefined ? (body.personId || '') : r.PersonId,
    body.note          !== undefined ? (body.note || '')  : r.Note,
    r.CreatedAt
  ]);
  return fmtTransaction(findById('Transactions', id), getRows('Persons'));
}

function deleteTransaction(id) {
  var r = findById('Transactions', id);
  if (!r) throw new Error('Transaction not found');
  deleteRowAt('Transactions', r._row);
  return { deleted: true };
}

function getTransactionSummary(month) {
  if (!month) month = currentMonth();
  var rows = getRows('Transactions').filter(function(r) {
    var d = toIso(r.Date);
    return d && d.indexOf(month) === 0;
  });
  var income = 0, expenses = 0, familyTransfers = 0, borrowsGiven = 0, borrowRecoveries = 0;
  rows.forEach(function(r) {
    var amt = parseFloat(r.Amount) || 0;
    if (r.Type === 'INCOME')           income           += amt;
    if (r.Type === 'EXPENSE')          expenses         += amt;
    if (r.Type === 'FAMILY_TRANSFER')  familyTransfers  += amt;
    if (r.Type === 'BORROW_GIVEN')     borrowsGiven     += amt;
    if (r.Type === 'BORROW_RECEIVED')  borrowRecoveries += amt;
  });
  var realSavings = income - expenses - familyTransfers + borrowRecoveries - borrowsGiven;
  var savingsRate = income > 0 ? Math.round((realSavings / income) * 100) : 0;
  return { income: round(income), expenses: round(expenses), familyTransfers: round(familyTransfers),
           borrowsGiven: round(borrowsGiven), borrowRecoveries: round(borrowRecoveries),
           realSavings: round(realSavings), savingsRate: savingsRate };
}

// ==================== PERSONS ====================

function fmtPerson(r) {
  return { id: parseInt(r.ID), name: r.Name, type: r.Type, phone: r.Phone || null, createdAt: toIso(r.CreatedAt) };
}

function getPersons(type) {
  var rows = getRows('Persons');
  if (type) rows = rows.filter(function(r) { return r.Type === type; });
  var result = rows.map(fmtPerson);
  result.sort(function(a, b) { return a.name.localeCompare(b.name); });
  return result;
}

function createPerson(body) {
  var id  = nextId('Persons');
  var now = new Date().toISOString();
  appendRow('Persons', [id, body.name, body.type, body.phone || '', now]);
  return { id: id, name: body.name, type: body.type, phone: body.phone || null, createdAt: now };
}

function deletePerson(id) {
  var txnLinked = getRows('Transactions').some(function(r) { return parseInt(r.PersonId) === parseInt(id); });
  var borLinked = getRows('Borrows').some(function(r)       { return parseInt(r.PersonId) === parseInt(id); });
  if (txnLinked || borLinked) throw new Error('Cannot delete person with linked transactions or borrows.');
  var split = getRows('SplitBalances').find(function(r) { return parseInt(r.PersonId) === parseInt(id); });
  if (split) deleteRowAt('SplitBalances', split._row);
  var r = findById('Persons', id);
  if (!r) throw new Error('Person not found');
  deleteRowAt('Persons', r._row);
  return { deleted: true };
}

// ==================== BORROWS ====================

function calcInterest(principal, rate, startDate) {
  if (!rate || !startDate) return 0;
  var days = (Date.now() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24);
  return principal * (rate / 100) * (days / 365);
}

function fmtBorrow(r, persons, allPayments) {
  var bid = parseInt(r.ID);
  var person = persons.find(function(p) { return parseInt(p.ID) === parseInt(r.PersonId); }) || null;
  var payments = allPayments.filter(function(p) { return parseInt(p.BorrowId) === bid; });
  var totalPaid = payments.reduce(function(s, p) { return s + (parseFloat(p.Amount) || 0); }, 0);
  var principal = parseFloat(r.Principal) || 0;
  var interest  = calcInterest(principal, parseFloat(r.InterestRate) || 0, toIso(r.StartDate));
  var totalOwed = principal + interest - totalPaid;
  payments.sort(function(a, b) { return toIso(b.Date) > toIso(a.Date) ? 1 : -1; });
  return {
    id: bid, personId: parseInt(r.PersonId), principal: principal,
    interestRate: parseFloat(r.InterestRate) || 0,
    startDate: toIso(r.StartDate), status: r.Status, createdAt: toIso(r.CreatedAt),
    person: person ? { id: parseInt(person.ID), name: person.Name, type: person.Type } : null,
    payments: payments.map(function(p) {
      return { id: parseInt(p.ID), borrowId: parseInt(p.BorrowId), amount: parseFloat(p.Amount),
               date: toIso(p.Date), note: p.Note || null };
    }),
    totalPaid: round(totalPaid), interestOwed: round(interest), totalOwed: round(totalOwed),
  };
}

function getBorrows(status) {
  var rows = getRows('Borrows');
  if (status) rows = rows.filter(function(r) { return r.Status === status; });
  var persons  = getRows('Persons');
  var payments = getRows('BorrowPayments');
  var result = rows.map(function(r) { return fmtBorrow(r, persons, payments); });
  result.sort(function(a, b) { return a.startDate > b.startDate ? 1 : -1; });
  return result;
}

function createBorrow(body) {
  if (!findById('Persons', body.personId)) throw new Error('Person not found');
  var id  = nextId('Borrows');
  var now = new Date().toISOString();
  appendRow('Borrows', [id, body.personId, body.principal, body.interestRate || 0, body.startDate, 'ACTIVE', now]);
  return fmtBorrow(findById('Borrows', id), getRows('Persons'), []);
}

function addBorrowPayment(borrowId, body) {
  var borrow = findById('Borrows', borrowId);
  if (!borrow) throw new Error('Borrow not found');
  if (borrow.Status === 'SETTLED') throw new Error('Cannot add payment to a settled borrow');

  var payId = nextId('BorrowPayments');
  appendRow('BorrowPayments', [payId, borrowId, body.amount, body.date, body.note || '']);

  var allPay    = getRows('BorrowPayments');
  var borPay    = allPay.filter(function(p) { return parseInt(p.BorrowId) === parseInt(borrowId); });
  var totalPaid = borPay.reduce(function(s, p) { return s + (parseFloat(p.Amount) || 0); }, 0);
  var principal = parseFloat(borrow.Principal) || 0;
  var interest  = calcInterest(principal, parseFloat(borrow.InterestRate) || 0, toIso(borrow.StartDate));
  var newStatus = (principal + interest - totalPaid) <= 0 ? 'SETTLED' : 'PARTIALLY_RETURNED';

  updateRowAt('Borrows', borrow._row, [
    borrow.ID, borrow.PersonId, borrow.Principal, borrow.InterestRate,
    borrow.StartDate, newStatus, borrow.CreatedAt
  ]);
  return fmtBorrow(findById('Borrows', borrowId), getRows('Persons'), getRows('BorrowPayments'));
}

function settleBorrow(id) {
  var r = findById('Borrows', id);
  if (!r) throw new Error('Borrow not found');
  updateRowAt('Borrows', r._row, [r.ID, r.PersonId, r.Principal, r.InterestRate, r.StartDate, 'SETTLED', r.CreatedAt]);
  return fmtBorrow(findById('Borrows', id), getRows('Persons'), getRows('BorrowPayments'));
}

function deleteBorrow(id) {
  var r = findById('Borrows', id);
  if (!r) throw new Error('Borrow not found');
  var payments = getRows('BorrowPayments').filter(function(p) { return parseInt(p.BorrowId) === parseInt(id); });
  payments.sort(function(a, b) { return b._row - a._row; }); // delete bottom-up
  payments.forEach(function(p) { deleteRowAt('BorrowPayments', p._row); });
  deleteRowAt('Borrows', r._row);
  return { deleted: true };
}

function getBorrowSummary() {
  var borrows  = getRows('Borrows');
  var payments = getRows('BorrowPayments');
  var totalLent = 0, totalRecovered = 0, totalOutstanding = 0, activeCount = 0;
  borrows.forEach(function(b) {
    var principal = parseFloat(b.Principal) || 0;
    totalLent += principal;
    var paid = payments.filter(function(p) { return parseInt(p.BorrowId) === parseInt(b.ID); })
                       .reduce(function(s, p) { return s + (parseFloat(p.Amount) || 0); }, 0);
    totalRecovered += paid;
    if (b.Status !== 'SETTLED') {
      var interest = calcInterest(principal, parseFloat(b.InterestRate) || 0, toIso(b.StartDate));
      totalOutstanding += principal + interest - paid;
      activeCount++;
    }
  });
  return { totalLent: round(totalLent), totalRecovered: round(totalRecovered),
           totalOutstanding: round(totalOutstanding), activeCount: activeCount };
}

// ==================== SPLITS ====================

function getSplits() {
  var rows    = getRows('SplitBalances');
  var persons = getRows('Persons');
  var result = rows.map(function(r) {
    var person = persons.find(function(p) { return parseInt(p.ID) === parseInt(r.PersonId); });
    return {
      id: parseInt(r.ID), personId: parseInt(r.PersonId),
      name: person ? person.Name : 'Unknown',
      balance: parseFloat(r.Balance) || 0,
      source: r.Source || 'MANUAL',
      lastSyncedAt: toIso(r.LastSyncedAt) || null,
    };
  });
  result.sort(function(a, b) { return a.name.localeCompare(b.name); });
  return result;
}

function setManualSplit(body) {
  var existing = getRows('SplitBalances').find(function(r) { return parseInt(r.PersonId) === parseInt(body.personId); });
  var now = new Date().toISOString();
  if (existing) {
    updateRowAt('SplitBalances', existing._row, [existing.ID, body.personId, body.balance, 'MANUAL', now]);
  } else {
    appendRow('SplitBalances', [nextId('SplitBalances'), body.personId, body.balance, 'MANUAL', now]);
  }
  return getSplits().find(function(s) { return parseInt(s.personId) === parseInt(body.personId); });
}

// ==================== BUDGETS ====================

function getBudgets(month) {
  if (!month) month = currentMonth();
  var budgets = getRows('Budgets').filter(function(b) { return b.Month === month; });
  var txns    = getRows('Transactions').filter(function(t) {
    var d = toIso(t.Date);
    return t.Type === 'EXPENSE' && d && d.indexOf(month) === 0;
  });
  var spent = {};
  txns.forEach(function(t) {
    var cat = t.Category || 'OTHER';
    spent[cat] = (spent[cat] || 0) + (parseFloat(t.Amount) || 0);
  });
  return budgets.map(function(b) {
    var s   = round(spent[b.Category] || 0);
    var lim = parseFloat(b.MonthlyLimit) || 0;
    var pct = lim > 0 ? Math.round((s / lim) * 100) : 0;
    return { id: parseInt(b.ID), category: b.Category, monthlyLimit: lim, month: b.Month,
             spent: s, percentUsed: pct, overBudget: pct > 100 };
  });
}

function createBudget(body) {
  var existing = getRows('Budgets').find(function(b) { return b.Category === body.category && b.Month === body.month; });
  if (existing) {
    updateRowAt('Budgets', existing._row, [existing.ID, body.category, body.monthlyLimit, body.month]);
    return getBudgets(body.month).find(function(b) { return b.id === parseInt(existing.ID); });
  }
  var id = nextId('Budgets');
  appendRow('Budgets', [id, body.category, body.monthlyLimit, body.month]);
  return getBudgets(body.month).find(function(b) { return b.id === id; });
}

function updateBudget(id, body) {
  var r = findById('Budgets', id);
  if (!r) throw new Error('Budget not found');
  updateRowAt('Budgets', r._row, [id, r.Category, body.monthlyLimit, r.Month]);
  return getBudgets(r.Month).find(function(b) { return b.id === parseInt(id); });
}

function deleteBudget(id) {
  var r = findById('Budgets', id);
  if (!r) throw new Error('Budget not found');
  deleteRowAt('Budgets', r._row);
  return { deleted: true };
}

// ==================== REPORTS ====================

function getMonthlyBreakdown(month) {
  if (!month) month = currentMonth();
  var txns = getRows('Transactions').filter(function(t) {
    return t.Type === 'EXPENSE' && toIso(t.Date) && toIso(t.Date).indexOf(month) === 0;
  });
  var byCat = {}, byPay = {};
  txns.forEach(function(t) {
    var cat = t.Category || 'OTHER';
    var pm  = t.PaymentMethod;
    byCat[cat] = (byCat[cat] || 0) + (parseFloat(t.Amount) || 0);
    byPay[pm]  = (byPay[pm]  || 0) + (parseFloat(t.Amount) || 0);
  });
  var categories = Object.keys(byCat).map(function(k) { return { category: k, total: round(byCat[k]) }; });
  var paymentMethods = Object.keys(byPay).map(function(k) { return { method: k, total: round(byPay[k]) }; });
  categories.sort(function(a, b) { return b.total - a.total; });
  paymentMethods.sort(function(a, b) { return b.total - a.total; });
  return { categories: categories, paymentMethods: paymentMethods, topCategories: categories.slice(0, 3) };
}

function getSavingsRateTrend(monthsCount) {
  var result = [];
  var now = new Date();
  for (var i = monthsCount - 1; i >= 0; i--) {
    var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    var label = d.getFullYear() + '-' + pad(d.getMonth() + 1);
    var summary = getTransactionSummary(label);
    result.push(Object.assign({ month: label }, summary));
  }
  return result;
}

function getMoneyOutside() {
  var borrows  = getRows('Borrows').filter(function(b) { return b.Status !== 'SETTLED'; });
  var payments = getRows('BorrowPayments');
  var borrowsOutstanding = 0;
  borrows.forEach(function(b) {
    var principal = parseFloat(b.Principal) || 0;
    var paid = payments.filter(function(p) { return parseInt(p.BorrowId) === parseInt(b.ID); })
                       .reduce(function(s, p) { return s + (parseFloat(p.Amount) || 0); }, 0);
    var interest = calcInterest(principal, parseFloat(b.InterestRate) || 0, toIso(b.StartDate));
    borrowsOutstanding += principal + interest - paid;
  });
  var splitsOwed = getRows('SplitBalances')
    .filter(function(s) { return parseFloat(s.Balance) > 0; })
    .reduce(function(sum, s) { return sum + (parseFloat(s.Balance) || 0); }, 0);
  return {
    borrowsOutstanding: round(borrowsOutstanding),
    splitsOwed: round(splitsOwed),
    grandTotal: round(borrowsOutstanding + splitsOwed),
  };
}

// ==================== UTILITIES ====================

function round(n) { return Math.round(n * 100) / 100; }

// Run once to create all sheet tabs with headers.
function setupSheets() {
  Object.keys(HEADERS).forEach(function(name) { getSheet(name); });
  return 'All sheets created successfully.';
}
