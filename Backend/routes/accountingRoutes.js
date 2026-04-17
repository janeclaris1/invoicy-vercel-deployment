const express = require("express");
const {
  getAccounts,
  createAccount,
  getAccountById,
  updateAccount,
  deleteAccount,
  getJournalEntries,
  createJournalEntry,
  getJournalEntryById,
  updateJournalEntry,
  deleteJournalEntry,
  postJournalEntry,
  getGeneralLedger,
  getTrialBalance,
  getProfitLoss,
  getBalanceSheet,
  getExpenditures,
  createExpenditure,
  getExpenditureById,
  updateExpenditure,
  deleteExpenditure,
  recordExpenditureToLedger,
  getBills,
  createBill,
  getBillById,
  updateBill,
  deleteBill,
  getBudgets,
  createBudget,
  updateBudget,
  deleteBudget,
  getTaxRules,
  createTaxRule,
  updateTaxRule,
  deleteTaxRule,
  getExchangeRates,
  getEffectiveExchangeRate,
  createExchangeRate,
  deleteExchangeRate,
} = require("../controller/accountingController");
const { protect } = require("../middlewares/authMiddleware");
const { attachSubscriptionPlan, requirePlanPermission } = require("../middlewares/planMiddleware");

const router = express.Router();

router.use(protect);
router.use(attachSubscriptionPlan);

// Accounts
router.get("/accounts", getAccounts);
router.post("/accounts", createAccount);
router.get("/accounts/:id", getAccountById);
router.put("/accounts/:id", updateAccount);
router.delete("/accounts/:id", deleteAccount);

// Journal entries
router.get("/journal-entries", getJournalEntries);
router.post("/journal-entries", createJournalEntry);
router.get("/journal-entries/:id", getJournalEntryById);
router.put("/journal-entries/:id", updateJournalEntry);
router.delete("/journal-entries/:id", deleteJournalEntry);
router.post("/journal-entries/:id/post", postJournalEntry);

// Reports (Pro+ only)
router.get("/reports/general-ledger", requirePlanPermission("accounting.reports"), getGeneralLedger);
router.get("/reports/trial-balance", requirePlanPermission("accounting.reports"), getTrialBalance);
router.get("/reports/profit-loss", requirePlanPermission("accounting.reports"), getProfitLoss);
router.get("/reports/balance-sheet", requirePlanPermission("accounting.reports"), getBalanceSheet);

// Expenditures
router.get("/expenditures", getExpenditures);
router.post("/expenditures", createExpenditure);
router.get("/expenditures/:id", getExpenditureById);
router.put("/expenditures/:id", updateExpenditure);
router.delete("/expenditures/:id", deleteExpenditure);
router.post("/expenditures/:id/record-to-ledger", recordExpenditureToLedger);

// Bills (AP)
router.get("/bills", getBills);
router.post("/bills", createBill);
router.get("/bills/:id", getBillById);
router.put("/bills/:id", updateBill);
router.delete("/bills/:id", deleteBill);

// Budgets (Pro+ only)
router.get("/budgets", requirePlanPermission("accounting.budgets"), getBudgets);
router.post("/budgets", requirePlanPermission("accounting.budgets"), createBudget);
router.put("/budgets/:id", requirePlanPermission("accounting.budgets"), updateBudget);
router.delete("/budgets/:id", requirePlanPermission("accounting.budgets"), deleteBudget);

// Tax rules
router.get("/tax-rules", getTaxRules);
router.post("/tax-rules", createTaxRule);
router.put("/tax-rules/:id", updateTaxRule);
router.delete("/tax-rules/:id", deleteTaxRule);

// Exchange rates
router.get("/exchange-rates", getExchangeRates);
router.get("/exchange-rates/effective", getEffectiveExchangeRate);
router.post("/exchange-rates", createExchangeRate);
router.delete("/exchange-rates/:id", deleteExchangeRate);

module.exports = router;
