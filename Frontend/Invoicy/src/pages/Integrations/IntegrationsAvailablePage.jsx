import React, { useState, useEffect } from "react";
import { Plug, Check, Loader2 } from "lucide-react";

const STORAGE_KEY_CONNECTED = "invoicy_integrations_connected";

const AVAILABLE = [
  { id: "quickbooks", name: "QuickBooks", category: "Accounting", icon: "📊", description: "Sync invoices and expenses" },
  { id: "xero", name: "Xero", category: "Accounting", icon: "📈", description: "Accounting and bookkeeping" },
  { id: "stripe", name: "Stripe", category: "Payments", icon: "💳", description: "Accept payments online" },
  { id: "paystack", name: "Paystack", category: "Payments", icon: "💰", description: "Payments for Africa" },
  { id: "gmail", name: "Gmail", category: "Email", icon: "📧", description: "Send invoices and reminders" },
  { id: "sendgrid", name: "SendGrid", category: "Email", icon: "✉️", description: "Transactional email" },
  { id: "slack", name: "Slack", category: "Communication", icon: "💬", description: "Notifications and alerts" },
  { id: "zapier", name: "Zapier", category: "Automation", icon: "⚡", description: "Connect 5000+ apps" },
  { id: "google-drive", name: "Google Drive", category: "Storage", icon: "📁", description: "Store and backup files" },
  { id: "hubspot", name: "HubSpot", category: "CRM", icon: "🎯", description: "Contacts and marketing" },
  { id: "whatsapp", name: "WhatsApp Business", category: "Communication", icon: "📱", description: "Chat and notifications" },
  { id: "gra", name: "GRA VAT", category: "Tax", icon: "🏛️", description: "Ghana Revenue Authority" },
];

const loadConnected = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONNECTED);
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
};

const saveConnected = (list) => {
  localStorage.setItem(STORAGE_KEY_CONNECTED, JSON.stringify(list));
};

const IntegrationsAvailablePage = () => {
  const [connected, setConnected] = useState(loadConnected);
  const [connecting, setConnecting] = useState(null);

  useEffect(() => {
    saveConnected(connected);
  }, [connected]);

  const isConnected = (id) => connected.some((c) => c.id === id);

  const connect = (item) => {
    if (isConnected(item.id)) return;
    setConnecting(item.id);
    setTimeout(() => {
      setConnected((prev) => [
        ...prev,
        {
          id: item.id,
          name: item.name,
          category: item.category,
          icon: item.icon,
          connectedAt: new Date().toISOString(),
        },
      ]);
      setConnecting(null);
    }, 1200);
  };

  return (
    <div>
      <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
        Browse and connect third-party apps. (Demo: connections are stored locally.)
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {AVAILABLE.map((item) => {
          const connected = isConnected(item.id);
          const loading = connecting === item.id;
          return (
            <div
              key={item.id}
              className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-5 flex flex-col"
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-2xl">{item.icon}</span>
                {connected ? (
                  <span className="inline-flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                    <Check className="w-4 h-4" />
                    Connected
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => connect(item)}
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-70"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plug className="w-4 h-4" />}
                    Connect
                  </button>
                )}
              </div>
              <p className="font-medium text-gray-900 dark:text-white">{item.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{item.category}</p>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">{item.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default IntegrationsAvailablePage;
