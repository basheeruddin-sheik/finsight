# Test Cases — Finsight

> Run these manually after any significant change or deployment.
> Each case lists the action, expected result, and what to check.
> ✅ = pass  ❌ = fail

---

## TC-0: Server / Connectivity

| # | Action | Expected |
|---|--------|----------|
| 0.1 | Open Add Transaction page | Green "Server OK" badge appears within 2 seconds |
| 0.2 | Open app with server stopped | Red "Server offline" badge; no crash |
| 0.3 | Open `GET /persons` in browser | Returns JSON array (empty or with data) |

---

## TC-1: People (Persons Screen)

| # | Action | Expected |
|---|--------|----------|
| 1.1 | Open People → Manage People | Page loads, shows Friends and Family sections |
| 1.2 | Tap + → type name "Alice" → select Friend → Save | Alice appears in Friends list |
| 1.3 | Tap + → type name "Mum" → select Family → Save | Mum appears in Family list |
| 1.4 | Tap + → leave name blank → tap Save | Shows "Name is required" error, modal stays open |
| 1.5 | Tap Delete on Alice → confirm | Alice removed from list |
| 1.6 | Add a transaction linked to a person, then try to delete that person | Shows "Cannot delete" error, person stays |

---

## TC-2: Add Transaction

| # | Action | Expected |
|---|--------|----------|
| 2.1 | Tap + FAB → page opens | "Server OK" badge; amount field auto-focused |
| 2.2 | Leave amount blank → tap Save | Shows "Enter a valid amount" error |
| 2.3 | Enter amount "-100" → tap Save | Shows "Enter a valid amount" error |
| 2.4 | Enter 500 → Expense → Food → GPay → tap Save | Navigates to Home; Home shows ₹500 in Spent |
| 2.5 | Enter 80000 → Income → Bank Transfer → tap Save | Home shows ₹80,000 in Income |
| 2.6 | Select Family Transfer → no family members added yet | Shows red warning "No family members found. Add them in People first." |
| 2.7 | Select Family Transfer → select Mum → enter 5000 → Save | Transaction saved; Family screen shows ₹5,000 for Mum |
| 2.8 | Select Borrow Given → select Alice → enter 10000 → Save | Borrows summary shows ₹10,000 Lent |
| 2.9 | Add note "groceries" → Save | Transaction list shows the note in subtitle |
| 2.10| Change date to last month → Save | Transaction appears when filtering by that month |

---

## TC-3: Transactions List

| # | Action | Expected |
|---|--------|----------|
| 3.1 | Open Transactions | All transactions shown, newest first |
| 3.2 | Tap "Expense" filter | Only EXPENSE rows shown |
| 3.3 | Tap "Income" filter | Only INCOME rows shown |
| 3.4 | Tap "Family" filter | Only FAMILY_TRANSFER rows shown |
| 3.5 | Tap "Lent" filter | Only BORROW_GIVEN rows shown |
| 3.6 | Tap "Returns" filter | Only BORROW_RECEIVED rows shown |
| 3.7 | Tap "All" filter | All rows return |
| 3.8 | Tap a transaction row | Delete / Cancel buttons appear below |
| 3.9 | Tap Delete → confirm | Transaction removed from list |
| 3.10| Tap Delete → Cancel | Transaction stays; no action taken |

---

## TC-4: Home Screen

| # | Action | Expected |
|---|--------|----------|
| 4.1 | Open Home | Shows current month name; 4 summary cards |
| 4.2 | After adding ₹80,000 income | Income card shows ₹80,000 |
| 4.3 | After adding ₹500 expense | Spent card shows ₹500 |
| 4.4 | After adding ₹5,000 family transfer | Family card shows ₹5,000 |
| 4.5 | Savings card | Shows Income − Expenses − Family = correct value |
| 4.6 | Recent list | Shows last 5 transactions with type, date, amount |
| 4.7 | Tap "See all" | Navigates to Transactions screen |

---

## TC-5: Borrows Screen

| # | Action | Expected |
|---|--------|----------|
| 5.1 | Open Borrows | Summary bar shows Lent / Recovered / Outstanding |
| 5.2 | Tap + → no people added | Modal shows "No people found" with Go to People button |
| 5.3 | Tap + → select Alice → enter 10000 → 12% interest → Save | Borrow appears; Outstanding shows ~₹10,100 (with interest) |
| 5.4 | Tap borrow row to expand | Shows interest breakdown, payment history, action buttons |
| 5.5 | Expand → Add Payment → enter 3000 → Save | Status changes to "Partial"; Outstanding reduces by ₹3,000 |
| 5.6 | Add Payment → leave amount blank | Shows "Enter a valid amount" error |
| 5.7 | Expand → Mark Settled → confirm | Status changes to "Settled"; moves to hidden settled list |
| 5.8 | "Show N settled" link | Reveals settled borrows in list |
| 5.9 | Expand any borrow → Delete → confirm | Borrow and all payments removed |
| 5.10| Summary bar after settle | Outstanding goes to ₹0; Recovered shows total paid |

---

## TC-6: Family Screen

| # | Action | Expected |
|---|--------|----------|
| 6.1 | Open Family (no family members) | "No family members yet. Add them in People." |
| 6.2 | Add Mum as Family member + add a ₹5,000 Family Transfer to Mum | Mum appears with ₹5,000 this month |
| 6.3 | Tap Mum's card | Expands to show list of individual transfers |
| 6.4 | "This month" total | Correct sum of current month's transfers to Mum |
| 6.5 | "All time" total | Sum of all transfers regardless of month |

---

## TC-7: Friends & Splits Screen

| # | Action | Expected |
|---|--------|----------|
| 7.1 | Open Splits (no friends) | Totals show ₹0; FAB not visible (no friends to add) |
| 7.2 | Add Alice as Friend; open Splits → tap + | Modal shows Alice in dropdown |
| 7.3 | Select Alice → enter 500 → Save | Alice card shows +₹500; "They owe you" total = ₹500 |
| 7.4 | Tap + → blank balance → Save | Shows "Enter a valid balance" error |
| 7.5 | Tap Alice card to edit → change to -200 → Save | Balance updates; "You owe" total increases |
| 7.6 | Tap "Sync Splitwise" (no API key) | Shows "Sync failed — check API key" message |
| 7.7 | Net calculation | Net = (they owe) − (you owe) = correct value |

---

## TC-8: Budgets Screen

| # | Action | Expected |
|---|--------|----------|
| 8.1 | Open Budgets | Current month shown; "No budgets set" if none |
| 8.2 | Tap "Add budget" → Food → ₹5,000 → Add | Food budget card appears with 0% used |
| 8.3 | Add ₹1,000 Food expense → return to Budgets | Food shows ₹1,000 spent, 20% bar |
| 8.4 | Add budget with limit 0 | Shows "Enter a limit greater than 0" |
| 8.5 | Add budget with blank limit | Shows "Enter a limit greater than 0" |
| 8.6 | Spend > budget limit → Budgets | Bar is red, "Over!" badge appears |
| 8.7 | Tap Edit on budget → enter 8000 → Save | Limit updates; % recalculates |
| 8.8 | Tap Edit → blank limit → Save | Shows "Enter a limit greater than 0" |
| 8.9 | Tap ✕ → confirm | Budget deleted; card removed |
| 8.10| Navigate to previous month | Shows budgets for that month (empty if none set) |

---

## TC-9: Reports Screen

| # | Action | Expected |
|---|--------|----------|
| 9.1 | Open Reports | Shows current month's data; 4 sections |
| 9.2 | Spending by Category (with expenses) | Bar chart shows categories sorted by amount |
| 9.3 | Spending by Category (no expenses) | Shows "No expenses this month" |
| 9.4 | Payment Methods pie chart | Pie shows breakdown by GPay/Cash/etc. |
| 9.5 | Savings Rate chart | Line chart for last 6 months |
| 9.6 | Money Outside | Borrows outstanding + splits owed = correct total |
| 9.7 | Tap ‹ to go back a month | Data updates for previous month |
| 9.8 | Tap › on current month | Button is greyed out; can't go to future |

---

## TC-10: Navigation

| # | Action | Expected |
|---|--------|----------|
| 10.1 | Home tab active on / | Home tab is highlighted |
| 10.2 | Open /borrows | Borrows tab NOT in bottom nav; back is possible via browser |
| 10.3 | Open /people | People tab highlighted; shows hub with 3 options |
| 10.4 | Open /insights | Insights tab highlighted; shows hub with 2 options |
| 10.5 | FAB (＋) button | Stays inside the card on wide screens (not at edge of viewport) |
| 10.6 | Bottom nav on iPhone | All 5 tabs visible, no overlap with FAB |

---

## TC-11: PWA / iPhone

| # | Action | Expected |
|---|--------|----------|
| 11.1 | Open Vercel URL in Safari → Share → Add to Home Screen | App installs with "Finsight" name and dark icon |
| 11.2 | Open from home screen | Runs full screen (no Safari address bar) |
| 11.3 | Add transaction from iPhone | Saves to Google Sheet; visible in sheet within 1–2 seconds |
| 11.4 | Open Google Sheet on laptop | New transaction row appears |
| 11.5 | Edit a value directly in the sheet → reload app | App shows updated value |

---

## TC-12: Data Integrity

| # | Action | Expected |
|---|--------|----------|
| 12.1 | Create borrow → add 3 payments → delete borrow | All 3 payments also deleted (no orphan rows in sheet) |
| 12.2 | Create person → link transaction → try to delete person | Error: "Cannot delete person with linked transactions" |
| 12.3 | Add budget for Food in June → navigate to July → add Food budget | Creates separate budget for July; June budget unchanged |
| 12.4 | Add split for Alice → update it → check sheet | Single row for Alice updated (not duplicated) |
| 12.5 | Submit 2 rapid saves in Add Transaction | Second click is blocked (button disabled during save) |

---

## TC-13: Error States

| # | Action | Expected |
|---|--------|----------|
| 13.1 | Server offline → open Home | Shows "Could not reach the server" message; no crash |
| 13.2 | Server offline → try to save transaction | Shows specific error, not blank screen |
| 13.3 | Server offline → open Borrows | Loading stops; shows empty list, not infinite spinner |
| 13.4 | Server offline → open Reports | Loading stops; shows empty charts with no crash |
| 13.5 | Server offline → open Budgets | Loading stops; shows "No budgets" message |

---

## Running All Tests

Estimated time: ~30 minutes for full run.

Recommended order:
1. TC-0 (connectivity check)
2. TC-1 (add people — needed for other tests)
3. TC-2 (add transactions — needed for summary/reports)
4. TC-3 through TC-9 (feature by feature)
5. TC-10 (navigation)
6. TC-11 (PWA — do on iPhone after Vercel deploy)
7. TC-12 (data integrity)
8. TC-13 (error states — stop the server to test)
