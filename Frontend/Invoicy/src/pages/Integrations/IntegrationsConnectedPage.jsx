import React, { useState, useEffect } from "react";
import { Link2, Check, Loader2, Trash2 } from "lucide-react";

const STORAGE_KEY = "invoicy_integrations_connected";

const loadConnected = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
};

const saveConnected = (list) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
};

const IntegrationsConnectedPage = () => {
  const [connected, setConnected] = useState(loadConnected);
  const [disconnecting, setDisconnecting] = useState(null);

  useEffect(() => {
    saveConnected(connected);
  }, [connected]);

  const disconnect = (id) => {
    setDisconnecting(id);
    setTimeout(() => {
      setConnected((prev) => prev.filter((c) => c.id !== id));
      setDisconnecting(null);
    }, 600);
  };

  return (
    <div>
      <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
        Apps and services connected to your account. Disconnect any time. (Demo: data is stored locally.)
      </p>
      {connected.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-12 text-center">
          <Link2 className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-500 mb-4" />
          <p className="text-gray-500 dark:text-gray-400">No integrations connected yet.</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Go to the Available tab to connect apps.</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {connected.map((item) => (
            <li
              key={item.id}
              className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-5 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{item.icon || "🔌"}</span>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{item.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{item.category || "Integration"}</p>
                  {item.connectedAt && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      Connected {new Date(item.connectedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => disconnect(item.id)}
                disabled={disconnecting === item.id}
                className="inline-flex items-center gap-2 px-4 py-2 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-medium"
              >
                {disconnecting === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Disconnect
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default IntegrationsConnectedPage;
