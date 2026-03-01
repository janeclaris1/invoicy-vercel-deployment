const Account = require("../models/Account");
const JournalEntry = require("../models/JournalEntry");
const Expenditure = require("../models/Expenditure");
const Bill = require("../models/Bill");
const Budget = require("../models/Budget");
const TaxRule = require("../models/TaxRule");
const ExchangeRate = require("../models/ExchangeRate");
const mongoose = require("mongoose");

// -------- Default chart of accounts (seed when empty) --------
const DEFAULT_ACCOUNTS = [
  { code: "1000", name: "Cash and Bank", type: "asset" },
  { code: "1100", name: "Accounts Receivable", type: "asset" },
  { code: "1200", name: "Inventory", type: "asset" },
  { code: "1300", name: "Prepaid Expenses", type: "asset" },
  { code: "1400", name: "Fixed Assets", type: "asset" },
  { code: "2000", name: "Accounts Payable", type: "liability" },
  { code: "2100", name: "VAT Payable", type: "liability" },
  { code: "2200", name: "Accrued Expenses", type: "liability" },
  { code: "2300", name: "Loans Payable", type: "liability" },
  { code: "3000", name: "Owner's Equity", type: "equity" },
  { code: "3100", name: "Retained Earnings", type: "equity" },
  { code: "4000", name: "Sales Revenue", type: "revenue" },
  { code: "4100", name: "Service Revenue", type: "revenue" },
  { code: "4200", name: "Other Income", type: "revenue" },
  { code: "5000", name: "Cost of Goods Sold", type: "expense" },
  { code: "5100", name: "Operating Expenses", type: "expense" },
  { code: "5200", name: "Salaries and Wages", type: "expense" },
  { code: "5300", name: "Rent", type: "expense" },
  { code: "5400", name: "Utilities", type: "expense" },
];

// -------- Accounts --------
exports.getAccounts = async (req, res) => {
  try {
    const userId = req.user._id;
    let accounts = await Account.find({ user: userId }).sort({ code: 1 }).lean();
    if (accounts.length === 0) {
      const toInsert = DEFAULT_ACCOUNTS.map((a) => ({ user: userId, ...a, isSystem: true }));
      const created = await Account.insertMany(toInsert);
      accounts = created.map((d) => d.toObject ? d.toObject() : d);
    }
    return res.json(accounts);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to get accounts" });
  }
};

exports.createAccount = async (req, res) => {
  try {
    const userId = req.user._id;
    const { code, name, type, openingBalance } = req.body;
    if (!code || !name || !type) {
      return res.status(400).json({ message: "Code, name, and type are required" });
    }
    const exists = await Account.findOne({ user: userId, code: String(code).trim() });
    if (exists) return res.status(400).json({ message: "An account with this code already exists" });
    const account = await Account.create({
      user: userId,
      code: String(code).trim(),
      name: String(name).trim(),
      type,
      openingBalance: Number(openingBalance) || 0,
    });
    return res.status(201).json(account);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to create account" });
  }
};

exports.getAccountById = async (req, res) => {
  try {
    const userId = req.user._id;
    const account = await Account.findOne({ _id: req.params.id, user: userId }).lean();
    if (!account) return res.status(404).json({ message: "Account not found" });
    const balances = await getAccountBalancesAsOf(userId, new Date());
    const b = balances.find((x) => x.accountId.toString() === account._id.toString());
    if (b) account.balance = b.balance;
    else account.balance = account.openingBalance || 0;
    return res.json(account);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to get account" });
  }
};

exports.updateAccount = async (req, res) => {
  try {
    const userId = req.user._id;
    const account = await Account.findOne({ _id: req.params.id, user: userId });
    if (!account) return res.status(404).json({ message: "Account not found" });
    const { name, type, openingBalance } = req.body;
    if (name !== undefined) account.name = String(name).trim();
    if (type !== undefined) account.type = type;
    if (openingBalance !== undefined) account.openingBalance = Number(openingBalance);
    await account.save();
    return res.json(account);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to update account" });
  }
};

exports.deleteAccount = async (req, res) => {
  try {
    const userId = req.user._id;
    const account = await Account.findOne({ _id: req.params.id, user: userId });
    if (!account) return res.status(404).json({ message: "Account not found" });
    if (account.isSystem) {
      return res.status(400).json({ message: "System accounts cannot be deleted" });
    }
    const used = await JournalEntry.findOne({
      user: userId,
      "lines.account": account._id,
      status: "posted",
    });
    if (used) return res.status(400).json({ message: "Account is used in posted entries and cannot be deleted" });
    await Account.deleteOne({ _id: account._id });
    return res.json({ message: "Account deleted" });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to delete account" });
  }
};

// -------- Journal Entries --------
exports.getJournalEntries = async (req, res) => {
  try {
    const userId = req.user._id;
    const { from, to, status } = req.query;
    const filter = { user: userId };
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }
    if (status) filter.status = status;
    const entries = await JournalEntry.find(filter)
      .populate("lines.account", "code name type")
      .sort({ date: -1, createdAt: -1 })
      .lean();
    return res.json(entries);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to get journal entries" });
  }
};

exports.createJournalEntry = async (req, res) => {
  try {
    const userId = req.user._id;
    const { date, description, lines } = req.body;
    if (!date || !lines || !Array.isArray(lines) || lines.length < 2) {
      return res.status(400).json({ message: "Date and at least two lines are required" });
    }
    let totalDebit = 0,
      totalCredit = 0;
    const accountIds = [...new Set(lines.map((l) => l.accountId || l.account).filter(Boolean))];
    const accounts = await Account.find({ _id: { $in: accountIds }, user: userId }).lean();
    const accountMap = {};
    accounts.forEach((a) => (accountMap[a._id.toString()] = a));
    const normalizedLines = [];
    for (const l of lines) {
      const aid = (l.accountId || l.account || "").toString();
      const acc = accountMap[aid];
      if (!acc) return res.status(400).json({ message: `Account not found: ${aid}` });
      const debit = Number(l.debit) || 0;
      const credit = Number(l.credit) || 0;
      if (debit < 0 || credit < 0) return res.status(400).json({ message: "Debit and credit must be non-negative" });
      if (debit > 0 && credit > 0) return res.status(400).json({ message: "Each line must have either debit or credit, not both" });
      if (debit === 0 && credit === 0) continue;
      totalDebit += debit;
      totalCredit += credit;
      normalizedLines.push({
        account: acc._id,
        accountCode: acc.code,
        accountName: acc.name,
        debit,
        credit,
        memo: String(l.memo || "").trim(),
      });
    }
    if (normalizedLines.length < 2) return res.status(400).json({ message: "At least two non-zero lines are required" });
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return res.status(400).json({ message: "Total debits must equal total credits" });
    }
    const count = await JournalEntry.countDocuments({ user: userId });
    const entryNumber = `JE-${String(count + 1).padStart(4, "0")}`;
    const entry = await JournalEntry.create({
      user: userId,
      entryNumber,
      date: new Date(date),
      description: String(description || "").trim(),
      lines: normalizedLines,
      totalDebit,
      totalCredit,
      status: "draft",
    });
    const populated = await JournalEntry.findById(entry._id).populate("lines.account", "code name type").lean();
    return res.status(201).json(populated);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to create journal entry" });
  }
};

exports.getJournalEntryById = async (req, res) => {
  try {
    const userId = req.user._id;
    const entry = await JournalEntry.findOne({ _id: req.params.id, user: userId })
      .populate("lines.account", "code name type")
      .lean();
    if (!entry) return res.status(404).json({ message: "Journal entry not found" });
    return res.json(entry);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to get journal entry" });
  }
};

exports.updateJournalEntry = async (req, res) => {
  try {
    const userId = req.user._id;
    const entry = await JournalEntry.findOne({ _id: req.params.id, user: userId });
    if (!entry) return res.status(404).json({ message: "Journal entry not found" });
    if (entry.status === "posted") {
      return res.status(400).json({ message: "Posted entries cannot be edited" });
    }
    const { date, description, lines } = req.body;
    if (lines && Array.isArray(lines) && lines.length >= 2) {
      let totalDebit = 0,
        totalCredit = 0;
      const accountIds = [...new Set(lines.map((l) => l.accountId || l.account).filter(Boolean))];
      const accounts = await Account.find({ _id: { $in: accountIds }, user: userId }).lean();
      const accountMap = {};
      accounts.forEach((a) => (accountMap[a._id.toString()] = a));
      const normalizedLines = [];
      for (const l of lines) {
        const aid = (l.accountId || l.account || "").toString();
        const acc = accountMap[aid];
        if (!acc) return res.status(400).json({ message: `Account not found: ${aid}` });
        const debit = Number(l.debit) || 0;
        const credit = Number(l.credit) || 0;
        if (debit < 0 || credit < 0) return res.status(400).json({ message: "Debit and credit must be non-negative" });
        if (debit > 0 && credit > 0) return res.status(400).json({ message: "Each line must have either debit or credit, not both" });
        if (debit === 0 && credit === 0) continue;
        totalDebit += debit;
        totalCredit += credit;
        normalizedLines.push({
          account: acc._id,
          accountCode: acc.code,
          accountName: acc.name,
          debit,
          credit,
          memo: String(l.memo || "").trim(),
        });
      }
      if (normalizedLines.length < 2) return res.status(400).json({ message: "At least two non-zero lines are required" });
      if (Math.abs(totalDebit - totalCredit) > 0.01) return res.status(400).json({ message: "Total debits must equal total credits" });
      entry.lines = normalizedLines;
      entry.totalDebit = totalDebit;
      entry.totalCredit = totalCredit;
    }
    if (date !== undefined) entry.date = new Date(date);
    if (description !== undefined) entry.description = String(description).trim();
    await entry.save();
    const populated = await JournalEntry.findById(entry._id).populate("lines.account", "code name type").lean();
    return res.json(populated);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to update journal entry" });
  }
};

exports.deleteJournalEntry = async (req, res) => {
  try {
    const userId = req.user._id;
    const entry = await JournalEntry.findOne({ _id: req.params.id, user: userId });
    if (!entry) return res.status(404).json({ message: "Journal entry not found" });
    if (entry.status === "posted") {
      return res.status(400).json({ message: "Posted entries cannot be deleted" });
    }
    await JournalEntry.deleteOne({ _id: entry._id });
    return res.json({ message: "Journal entry deleted" });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to delete journal entry" });
  }
};

exports.postJournalEntry = async (req, res) => {
  try {
    const userId = req.user._id;
    const entry = await JournalEntry.findOne({ _id: req.params.id, user: userId });
    if (!entry) return res.status(404).json({ message: "Journal entry not found" });
    if (entry.status === "posted") return res.status(400).json({ message: "Entry is already posted" });
    entry.status = "posted";
    await entry.save();
    const populated = await JournalEntry.findById(entry._id).populate("lines.account", "code name type").lean();
    return res.json(populated);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to post journal entry" });
  }
};

// -------- Helpers for reports: account balances from opening + posted entries --------
async function getAccountBalancesAsOf(userId, asOfDate) {
  const accounts = await Account.find({ user: userId }).lean();
  const balances = {};
  accounts.forEach((a) => {
    balances[a._id.toString()] = {
      accountId: a._id,
      code: a.code,
      name: a.name,
      type: a.type,
      openingBalance: a.openingBalance || 0,
      debit: 0,
      credit: 0,
      balance: a.openingBalance || 0,
    };
  });
  const entries = await JournalEntry.find({
    user: userId,
    status: "posted",
    date: { $lte: new Date(asOfDate) },
  })
    .sort({ date: 1 })
    .lean();
  entries.forEach((entry) => {
    entry.lines.forEach((line) => {
      const aid = (line.account && line.account._id ? line.account._id : line.account).toString();
      if (balances[aid]) {
        balances[aid].debit += line.debit || 0;
        balances[aid].credit += line.credit || 0;
      }
    });
  });
  Object.keys(balances).forEach((aid) => {
    const b = balances[aid];
    // Asset/expense: balance = opening + debits - credits. Liability/equity/revenue: balance = opening + credits - debits.
    if (["asset", "expense"].includes(b.type)) {
      b.balance = b.openingBalance + (b.debit - b.credit);
    } else {
      b.balance = b.openingBalance + (b.credit - b.debit);
    }
  });
  return Object.values(balances);
}

// -------- General Ledger --------
exports.getGeneralLedger = async (req, res) => {
  try {
    const userId = req.user._id;
    const { accountId, from, to } = req.query;
    if (!accountId) return res.status(400).json({ message: "accountId is required" });
    const account = await Account.findOne({ _id: accountId, user: userId });
    if (!account) return res.status(404).json({ message: "Account not found" });
    const fromDate = from ? new Date(from) : new Date(0);
    const toDate = to ? new Date(to) : new Date(9999, 11, 31);
    const entries = await JournalEntry.find({
      user: userId,
      status: "posted",
      date: { $gte: fromDate, $lte: toDate },
      "lines.account": account._id,
    })
      .sort({ date: 1 })
      .lean();
    const transactions = [];
    let runningBalance = account.openingBalance || 0;
    const normalSign = ["asset", "expense"].includes(account.type) ? 1 : -1;
    transactions.push({
      date: null,
      ref: "Opening",
      description: "Opening balance",
      debit: account.type === "asset" || account.type === "expense" ? Math.abs(runningBalance) : 0,
      credit: account.type === "liability" || account.type === "equity" || account.type === "revenue" ? Math.abs(runningBalance) : 0,
      balance: runningBalance,
    });
    entries.forEach((entry) => {
      entry.lines.forEach((line) => {
        const lineAccId = (line.account && line.account._id ? line.account._id : line.account).toString();
        if (lineAccId !== account._id.toString()) return;
        const debit = line.debit || 0;
        const credit = line.credit || 0;
        runningBalance += (debit - credit) * normalSign;
        transactions.push({
          date: entry.date,
          ref: entry.entryNumber,
          description: entry.description || "",
          debit,
          credit,
          balance: runningBalance,
        });
      });
    });
    return res.json({
      account: { _id: account._id, code: account.code, name: account.name, type: account.type },
      from: fromDate,
      to: toDate,
      transactions,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to get general ledger" });
  }
};

// -------- Trial Balance --------
exports.getTrialBalance = async (req, res) => {
  try {
    const userId = req.user._id;
    const asOf = req.query.asOf ? new Date(req.query.asOf) : new Date();
    const balances = await getAccountBalancesAsOf(userId, asOf);
    const rows = balances
      .filter((b) => Math.abs(b.balance) > 0.001)
      .map((b) => ({
        accountId: b.accountId,
        code: b.code,
        name: b.name,
        type: b.type,
        debit: b.balance > 0 ? b.balance : 0,
        credit: b.balance < 0 ? -b.balance : 0,
      }));
    const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
    const totalCredit = rows.reduce((s, r) => s + r.credit, 0);
    return res.json({ asOf, rows, totalDebit, totalCredit });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to get trial balance" });
  }
};

// -------- Profit & Loss (income statement) --------
exports.getProfitLoss = async (req, res) => {
  try {
    const userId = req.user._id;
    const from = req.query.from ? new Date(req.query.from) : new Date(new Date().getFullYear(), 0, 1);
    const to = req.query.to ? new Date(req.query.to) : new Date();
    const balances = await getAccountBalancesAsOf(userId, to);
    const revenueAccounts = balances.filter((b) => b.type === "revenue");
    const expenseAccounts = balances.filter((b) => b.type === "expense");
    const totalRevenue = revenueAccounts.reduce((s, b) => s + (b.balance > 0 ? b.balance : 0), 0);
    const totalExpenses = expenseAccounts.reduce((s, b) => s + (b.balance > 0 ? b.balance : 0), 0);
    const netIncome = totalRevenue - totalExpenses;
    return res.json({
      from,
      to,
      revenue: revenueAccounts.map((b) => ({ code: b.code, name: b.name, amount: b.balance })),
      expenses: expenseAccounts.map((b) => ({ code: b.code, name: b.name, amount: b.balance })),
      totalRevenue,
      totalExpenses,
      netIncome,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to get profit & loss" });
  }
};

// -------- Balance Sheet --------
exports.getBalanceSheet = async (req, res) => {
  try {
    const userId = req.user._id;
    const asOf = req.query.asOf ? new Date(req.query.asOf) : new Date();
    const balances = await getAccountBalancesAsOf(userId, asOf);
    const assets = balances.filter((b) => b.type === "asset").map((b) => ({ code: b.code, name: b.name, balance: b.balance }));
    const liabilities = balances.filter((b) => b.type === "liability").map((b) => ({ code: b.code, name: b.name, balance: b.balance }));
    const equity = balances.filter((b) => b.type === "equity").map((b) => ({ code: b.code, name: b.name, balance: b.balance }));
    const totalAssets = assets.reduce((s, b) => s + b.balance, 0);
    const totalLiabilities = liabilities.reduce((s, b) => s + b.balance, 0);
    const totalEquity = equity.reduce((s, b) => s + b.balance, 0);
    return res.json({
      asOf,
      assets,
      liabilities,
      equity,
      totalAssets,
      totalLiabilities,
      totalEquity,
      totalLiabilitiesAndEquity: totalLiabilities + totalEquity,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to get balance sheet" });
  }
};

// -------- Expenditures --------
exports.getExpenditures = async (req, res) => {
  try {
    const userId = req.user._id;
    const { from, to, status } = req.query;
    const filter = { user: userId };
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }
    if (status) filter.status = status;
    const list = await Expenditure.find(filter)
      .populate("expenseAccount", "code name type")
      .populate("paymentAccount", "code name type")
      .sort({ date: -1, createdAt: -1 })
      .lean();
    return res.json(list);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to get expenditures" });
  }
};

exports.createExpenditure = async (req, res) => {
  try {
    const userId = req.user._id;
    const { date, amount, expenseAccount, paymentAccount, description, vendor, paymentMethod, reference, receiptImage } = req.body;
    if (!date || amount == null || amount < 0 || !expenseAccount) {
      return res.status(400).json({ message: "Date, amount, and expense account are required" });
    }
    const expenseAcc = await Account.findOne({ _id: expenseAccount, user: userId });
    if (!expenseAcc) return res.status(400).json({ message: "Expense account not found" });
    let paymentAcc = null;
    if (paymentAccount) {
      paymentAcc = await Account.findOne({ _id: paymentAccount, user: userId });
      if (!paymentAcc) return res.status(400).json({ message: "Payment account not found" });
    }
    const expenditure = await Expenditure.create({
      user: userId,
      date: new Date(date),
      amount: Number(amount),
      expenseAccount: expenseAcc._id,
      paymentAccount: paymentAcc ? paymentAcc._id : null,
      description: String(description || "").trim(),
      vendor: String(vendor || "").trim(),
      paymentMethod: String(paymentMethod || "").trim(),
      reference: String(reference || "").trim(),
      receiptImage: receiptImage ? String(receiptImage).trim() : "",
      status: "draft",
    });
    const populated = await Expenditure.findById(expenditure._id)
      .populate("expenseAccount", "code name type")
      .populate("paymentAccount", "code name type")
      .lean();
    return res.status(201).json(populated);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to create expenditure" });
  }
};

exports.getExpenditureById = async (req, res) => {
  try {
    const userId = req.user._id;
    const expenditure = await Expenditure.findOne({ _id: req.params.id, user: userId })
      .populate("expenseAccount", "code name type")
      .populate("paymentAccount", "code name type")
      .populate("journalEntry", "entryNumber date status")
      .lean();
    if (!expenditure) return res.status(404).json({ message: "Expenditure not found" });
    return res.json(expenditure);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to get expenditure" });
  }
};

exports.updateExpenditure = async (req, res) => {
  try {
    const userId = req.user._id;
    const expenditure = await Expenditure.findOne({ _id: req.params.id, user: userId });
    if (!expenditure) return res.status(404).json({ message: "Expenditure not found" });
    if (expenditure.status === "recorded") {
      return res.status(400).json({ message: "Recorded expenditures cannot be edited" });
    }
    const { date, amount, expenseAccount, paymentAccount, description, vendor, paymentMethod, reference, receiptImage } = req.body;
    if (date !== undefined) expenditure.date = new Date(date);
    if (amount !== undefined && Number(amount) >= 0) expenditure.amount = Number(amount);
    if (expenseAccount !== undefined) {
      const acc = await Account.findOne({ _id: expenseAccount, user: userId });
      if (!acc) return res.status(400).json({ message: "Expense account not found" });
      expenditure.expenseAccount = acc._id;
    }
    if (paymentAccount !== undefined) {
      if (paymentAccount) {
        const acc = await Account.findOne({ _id: paymentAccount, user: userId });
        if (!acc) return res.status(400).json({ message: "Payment account not found" });
        expenditure.paymentAccount = acc._id;
      } else {
        expenditure.paymentAccount = null;
      }
    }
    if (description !== undefined) expenditure.description = String(description).trim();
    if (vendor !== undefined) expenditure.vendor = String(vendor).trim();
    if (paymentMethod !== undefined) expenditure.paymentMethod = String(paymentMethod).trim();
    if (reference !== undefined) expenditure.reference = String(reference).trim();
    if (receiptImage !== undefined) expenditure.receiptImage = receiptImage ? String(receiptImage).trim() : "";
    await expenditure.save();
    const populated = await Expenditure.findById(expenditure._id)
      .populate("expenseAccount", "code name type")
      .populate("paymentAccount", "code name type")
      .lean();
    return res.json(populated);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to update expenditure" });
  }
};

exports.deleteExpenditure = async (req, res) => {
  try {
    const userId = req.user._id;
    const expenditure = await Expenditure.findOne({ _id: req.params.id, user: userId });
    if (!expenditure) return res.status(404).json({ message: "Expenditure not found" });
    if (expenditure.status === "recorded") {
      return res.status(400).json({ message: "Recorded expenditures cannot be deleted" });
    }
    await Expenditure.deleteOne({ _id: expenditure._id });
    return res.json({ message: "Expenditure deleted" });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to delete expenditure" });
  }
};

exports.recordExpenditureToLedger = async (req, res) => {
  try {
    const userId = req.user._id;
    const expenditure = await Expenditure.findOne({ _id: req.params.id, user: userId })
      .populate("expenseAccount")
      .populate("paymentAccount");
    if (!expenditure) return res.status(404).json({ message: "Expenditure not found" });
    if (expenditure.status === "recorded") {
      return res.status(400).json({ message: "Expenditure is already recorded in the ledger" });
    }
    const expenseAcc = expenditure.expenseAccount;
    const paymentAcc = expenditure.paymentAccount;
    if (!expenseAcc) return res.status(400).json({ message: "Expense account not found" });
    const payAccount = paymentAcc || (await Account.findOne({ user: userId, code: "1000" })); // default Cash
    if (!payAccount) return res.status(400).json({ message: "Payment account not found. Set a payment account or add Cash (1000) to chart of accounts." });
    const amount = Number(expenditure.amount);
    const description = expenditure.description || `Expenditure: ${expenseAcc.name}${expenditure.vendor ? ` - ${expenditure.vendor}` : ""}`;
    const count = await JournalEntry.countDocuments({ user: userId });
    const entryNumber = `JE-${String(count + 1).padStart(4, "0")}`;
    const lines = [
      { account: expenseAcc._id, accountCode: expenseAcc.code, accountName: expenseAcc.name, debit: amount, credit: 0, memo: expenditure.reference || "" },
      { account: payAccount._id, accountCode: payAccount.code, accountName: payAccount.name, debit: 0, credit: amount, memo: "" },
    ];
    const entry = await JournalEntry.create({
      user: userId,
      entryNumber,
      date: expenditure.date,
      description,
      lines,
      totalDebit: amount,
      totalCredit: amount,
      status: "posted",
    });
    expenditure.status = "recorded";
    expenditure.journalEntry = entry._id;
    await expenditure.save();
    const populated = await Expenditure.findById(expenditure._id)
      .populate("expenseAccount", "code name type")
      .populate("paymentAccount", "code name type")
      .populate("journalEntry", "entryNumber date status")
      .lean();
    return res.json(populated);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to record expenditure to ledger" });
  }
};

// -------- Bills (AP) --------
exports.getBills = async (req, res) => {
  try {
    const userId = req.user._id;
    const { status, branch } = req.query;
    const filter = { user: userId };
    if (status) filter.status = status;
    if (branch) filter.branch = branch;
    const bills = await Bill.find(filter).sort({ billDate: -1, createdAt: -1 }).lean();
    return res.json(bills);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to get bills" });
  }
};

exports.createBill = async (req, res) => {
  try {
    const userId = req.user._id;
    const { vendorName, vendorId, vendorEmail, vendorAddress, billDate, dueDate, lineItems, subtotal, taxAmount, total, currency, notes, branch } = req.body;
    if (!vendorName || !vendorName.trim()) return res.status(400).json({ message: "Vendor name is required" });
    const totalNum = Number(total) || 0;
    const count = await Bill.countDocuments({ user: userId });
    const billNumber = `BILL-${String(count + 1).padStart(5, "0")}`;
    const bill = await Bill.create({
      user: userId,
      billNumber,
      vendorName: String(vendorName).trim(),
      vendorId: String(vendorId || "").trim(),
      vendorEmail: String(vendorEmail || "").trim(),
      vendorAddress: String(vendorAddress || "").trim(),
      billDate: billDate ? new Date(billDate) : new Date(),
      dueDate: dueDate ? new Date(dueDate) : null,
      lineItems: Array.isArray(lineItems) ? lineItems : [],
      subtotal: Number(subtotal) || 0,
      taxAmount: Number(taxAmount) || 0,
      total: totalNum,
      balanceDue: totalNum,
      currency: currency || "GHS",
      status: "draft",
      notes: String(notes || "").trim(),
      branch: branch || null,
    });
    return res.status(201).json(bill);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to create bill" });
  }
};

exports.getBillById = async (req, res) => {
  try {
    const userId = req.user._id;
    const bill = await Bill.findOne({ _id: req.params.id, user: userId }).lean();
    if (!bill) return res.status(404).json({ message: "Bill not found" });
    return res.json(bill);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to get bill" });
  }
};

exports.updateBill = async (req, res) => {
  try {
    const userId = req.user._id;
    const bill = await Bill.findOne({ _id: req.params.id, user: userId });
    if (!bill) return res.status(404).json({ message: "Bill not found" });
    if (bill.status === "paid") return res.status(400).json({ message: "Paid bills cannot be edited" });
    const { vendorName, vendorId, vendorEmail, vendorAddress, billDate, dueDate, lineItems, subtotal, taxAmount, total, currency, notes, status } = req.body;
    if (vendorName !== undefined) bill.vendorName = String(vendorName).trim();
    if (vendorId !== undefined) bill.vendorId = String(vendorId).trim();
    if (vendorEmail !== undefined) bill.vendorEmail = String(vendorEmail).trim();
    if (vendorAddress !== undefined) bill.vendorAddress = String(vendorAddress).trim();
    if (billDate !== undefined) bill.billDate = new Date(billDate);
    if (dueDate !== undefined) bill.dueDate = dueDate ? new Date(dueDate) : null;
    if (Array.isArray(lineItems)) bill.lineItems = lineItems;
    if (subtotal !== undefined) bill.subtotal = Number(subtotal);
    if (taxAmount !== undefined) bill.taxAmount = Number(taxAmount);
    if (total !== undefined) {
      bill.total = Number(total);
      if (bill.amountPaid === 0) bill.balanceDue = Number(total);
    }
    if (currency !== undefined) bill.currency = currency;
    if (notes !== undefined) bill.notes = String(notes).trim();
    if (status !== undefined && ["draft", "open", "partial", "paid", "cancelled"].includes(status)) bill.status = status;
    bill.balanceDue = Math.max(0, bill.total - (bill.amountPaid || 0));
    await bill.save();
    return res.json(bill);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to update bill" });
  }
};

exports.deleteBill = async (req, res) => {
  try {
    const userId = req.user._id;
    const bill = await Bill.findOne({ _id: req.params.id, user: userId });
    if (!bill) return res.status(404).json({ message: "Bill not found" });
    if (bill.status === "paid") return res.status(400).json({ message: "Paid bills cannot be deleted" });
    await Bill.deleteOne({ _id: bill._id });
    return res.json({ message: "Bill deleted" });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to delete bill" });
  }
};

// -------- Budgets --------
exports.getBudgets = async (req, res) => {
  try {
    const userId = req.user._id;
    const { periodYear, periodMonth, account, branch } = req.query;
    const filter = { user: userId };
    if (periodYear) filter.periodYear = Number(periodYear);
    if (periodMonth != null && periodMonth !== "") filter.periodMonth = Number(periodMonth);
    if (account) filter.account = account;
    if (branch) filter.branch = branch;
    const budgets = await Budget.find(filter).populate("account", "code name type").sort({ periodYear: -1, periodMonth: -1 }).lean();
    return res.json(budgets);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to get budgets" });
  }
};

exports.createBudget = async (req, res) => {
  try {
    const userId = req.user._id;
    const { account, periodType, periodYear, periodMonth, amount, currency, branch } = req.body;
    if (!account || !periodYear || amount == null) return res.status(400).json({ message: "account, periodYear, and amount are required" });
    const acc = await Account.findOne({ _id: account, user: userId });
    if (!acc) return res.status(400).json({ message: "Account not found" });
    const budget = await Budget.create({
      user: userId,
      account: acc._id,
      periodType: periodType || "yearly",
      periodYear: Number(periodYear),
      periodMonth: periodMonth != null ? Number(periodMonth) : null,
      amount: Number(amount),
      currency: currency || "GHS",
      branch: branch || null,
    });
    const populated = await Budget.findById(budget._id).populate("account", "code name type").lean();
    return res.status(201).json(populated);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to create budget" });
  }
};

exports.updateBudget = async (req, res) => {
  try {
    const userId = req.user._id;
    const budget = await Budget.findOne({ _id: req.params.id, user: userId }).populate("account", "code name type");
    if (!budget) return res.status(404).json({ message: "Budget not found" });
    const { amount, periodType, periodMonth } = req.body;
    if (amount !== undefined) budget.amount = Number(amount);
    if (periodType !== undefined) budget.periodType = periodType;
    if (periodMonth !== undefined) budget.periodMonth = periodMonth != null ? Number(periodMonth) : null;
    await budget.save();
    return res.json(budget);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to update budget" });
  }
};

exports.deleteBudget = async (req, res) => {
  try {
    const userId = req.user._id;
    const budget = await Budget.findOne({ _id: req.params.id, user: userId });
    if (!budget) return res.status(404).json({ message: "Budget not found" });
    await Budget.deleteOne({ _id: budget._id });
    return res.json({ message: "Budget deleted" });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to delete budget" });
  }
};

// -------- Tax Rules --------
exports.getTaxRules = async (req, res) => {
  try {
    const userId = req.user._id;
    const rules = await TaxRule.find({ user: userId }).sort({ type: 1, name: 1 }).lean();
    return res.json(rules);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to get tax rules" });
  }
};

exports.createTaxRule = async (req, res) => {
  try {
    const userId = req.user._id;
    const { name, code, rate, type, region, isDefault } = req.body;
    if (!name || rate == null) return res.status(400).json({ message: "name and rate are required" });
    const rule = await TaxRule.create({
      user: userId,
      name: String(name).trim(),
      code: String(code || "").trim(),
      rate: Number(rate),
      type: type || "VAT",
      region: String(region || "").trim(),
      isDefault: !!isDefault,
    });
    if (rule.isDefault) await TaxRule.updateMany({ user: userId, _id: { $ne: rule._id } }, { $set: { isDefault: false } });
    return res.status(201).json(rule);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to create tax rule" });
  }
};

exports.updateTaxRule = async (req, res) => {
  try {
    const userId = req.user._id;
    const rule = await TaxRule.findOne({ _id: req.params.id, user: userId });
    if (!rule) return res.status(404).json({ message: "Tax rule not found" });
    const { name, code, rate, type, region, isDefault, isActive } = req.body;
    if (name !== undefined) rule.name = String(name).trim();
    if (code !== undefined) rule.code = String(code).trim();
    if (rate !== undefined) rule.rate = Number(rate);
    if (type !== undefined) rule.type = type;
    if (region !== undefined) rule.region = String(region).trim();
    if (isDefault !== undefined) {
      rule.isDefault = !!isDefault;
      if (rule.isDefault) await TaxRule.updateMany({ user: userId, _id: { $ne: rule._id } }, { $set: { isDefault: false } });
    }
    if (isActive !== undefined) rule.isActive = !!isActive;
    await rule.save();
    return res.json(rule);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to update tax rule" });
  }
};

exports.deleteTaxRule = async (req, res) => {
  try {
    const userId = req.user._id;
    const rule = await TaxRule.findOne({ _id: req.params.id, user: userId });
    if (!rule) return res.status(404).json({ message: "Tax rule not found" });
    await TaxRule.deleteOne({ _id: rule._id });
    return res.json({ message: "Tax rule deleted" });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to delete tax rule" });
  }
};

// -------- Exchange Rates --------
exports.getExchangeRates = async (req, res) => {
  try {
    const userId = req.user._id;
    const { fromCurrency, toCurrency } = req.query;
    const filter = { user: userId };
    if (fromCurrency) filter.fromCurrency = fromCurrency;
    if (toCurrency) filter.toCurrency = toCurrency;
    const rates = await ExchangeRate.find(filter).sort({ effectiveFrom: -1 }).lean();
    return res.json(rates);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to get exchange rates" });
  }
};

exports.getEffectiveExchangeRate = async (req, res) => {
  try {
    const userId = req.user._id;
    const { fromCurrency, toCurrency, date } = req.query;
    if (!fromCurrency || !toCurrency) return res.status(400).json({ message: "fromCurrency and toCurrency are required" });
    const asOf = date ? new Date(date) : new Date();
    const rate = await ExchangeRate.findOne({
      user: userId,
      fromCurrency,
      toCurrency,
      effectiveFrom: { $lte: asOf },
    })
      .sort({ effectiveFrom: -1 })
      .lean();
    return res.json({ rate: rate ? rate.rate : null, fromCurrency, toCurrency, asOf: asOf.toISOString() });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to get exchange rate" });
  }
};

exports.createExchangeRate = async (req, res) => {
  try {
    const userId = req.user._id;
    const { fromCurrency, toCurrency, rate, effectiveFrom } = req.body;
    if (!fromCurrency || !toCurrency || rate == null) return res.status(400).json({ message: "fromCurrency, toCurrency, and rate are required" });
    const doc = await ExchangeRate.create({
      user: userId,
      fromCurrency: String(fromCurrency).trim(),
      toCurrency: String(toCurrency).trim(),
      rate: Number(rate),
      effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : new Date(),
    });
    return res.status(201).json(doc);
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to create exchange rate" });
  }
};

exports.deleteExchangeRate = async (req, res) => {
  try {
    const userId = req.user._id;
    const doc = await ExchangeRate.findOne({ _id: req.params.id, user: userId });
    if (!doc) return res.status(404).json({ message: "Exchange rate not found" });
    await ExchangeRate.deleteOne({ _id: doc._id });
    return res.json({ message: "Exchange rate deleted" });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to delete exchange rate" });
  }
};
