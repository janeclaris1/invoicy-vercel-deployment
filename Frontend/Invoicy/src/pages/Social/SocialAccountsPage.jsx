import React, { useState, useEffect } from "react";
import { Link2, Check, Loader2 } from "lucide-react";

const STORAGE_KEY = "invoicy_social_accounts";
const DEFAULT_ACCOUNTS = [
  { id: "facebook", name: "Facebook", icon: "📘", connected: false },
  { id: "instagram", name: "Instagram", icon: "📷", connected: false },
  { id: "twitter", name: "X (Twitter)", icon: "𝕏", connected: false },
  { id: "linkedin", name: "LinkedIn", icon: "💼", connected: false },
];

const loadAccounts = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return DEFAULT_ACCOUNTS.map((a) => {
        const saved = parsed.find((s) => s.id === a.id);
        return saved ? { ...a, connected: saved.connected } : a;
      });
    }
  } catch (_) {}
  return [...DEFAULT_ACCOUNTS];
};

const saveAccounts = (accounts) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts.map((a) => ({ id: a.id, connected: a.connected }))));
};

const SocialAccountsPage = () => {
  const [accounts, setAccounts] = useState(loadAccounts);
  const [connecting, setConnecting] = useState(null);

  useEffect(() => {
    saveAccounts(accounts);
  }, [accounts]);

  const toggle = (id) => {
    const acc = accounts.find((a) => a.id === id);
    if (!acc) return;
    if (acc.connected) {
      setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, connected: false } : a)));
      return;
    }
    setConnecting(id);
    setTimeout(() => {
      setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, connected: true } : a)));
      setConnecting(null);
    }, 1200);
  };

  return (
    <div>
      <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
        Connect your social accounts to schedule and publish posts from one place. (Demo: connect/disconnect is stored locally.)
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {accounts.map((acc) => (
          <div
            key={acc.id}
            className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-5 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{acc.icon}</span>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{acc.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {acc.connected ? "Connected" : "Not connected"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => toggle(acc.id)}
              disabled={connecting !== null && connecting !== acc.id}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
                acc.connected
                  ? "bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              {connecting === acc.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : acc.connected ? (
                <>
                  <Check className="w-4 h-4" />
                  Disconnect
                </>
              ) : (
                <>
                  <Link2 className="w-4 h-4" />
                  Connect
                </>
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SocialAccountsPage;
