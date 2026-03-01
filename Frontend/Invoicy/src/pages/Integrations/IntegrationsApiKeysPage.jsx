import React, { useState, useEffect } from "react";
import { Key, Plus, Trash2, Eye, EyeOff } from "lucide-react";

const STORAGE_KEY = "invoicy_integrations_api_keys";

const loadKeys = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
};

const saveKeys = (list) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
};

const IntegrationsApiKeysPage = () => {
  const [keys, setKeys] = useState(loadKeys);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [visibleId, setVisibleId] = useState(null);

  useEffect(() => {
    saveKeys(keys);
  }, [keys]);

  const addKey = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setKeys((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        name: name.trim(),
        value: value.trim(),
        createdAt: new Date().toISOString(),
      },
    ]);
    setName("");
    setValue("");
    setShowForm(false);
  };

  const remove = (id) => {
    if (!window.confirm("Delete this API key? It cannot be recovered.")) return;
    setKeys((prev) => prev.filter((k) => k.id !== id));
  };

  const mask = (str) => (str && str.length > 8 ? str.slice(0, 4) + "••••••••" + str.slice(-4) : str ? "••••••••" : "");

  return (
    <div>
      <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
        Store API keys for external services. Keys are kept in your browser only. (Demo: not for production secrets.)
      </p>

      {!showForm ? (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 mb-6"
        >
          <Plus className="w-4 h-4" />
          Add API key
        </button>
      ) : (
        <form onSubmit={addKey} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Key className="w-5 h-5" />
            New API key
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Stripe secret key"
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Value</label>
              <input
                type="password"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="sk_..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">
                Save
              </button>
              <button type="button" onClick={() => { setShowForm(false); setName(""); setValue(""); }} className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 dark:text-gray-300">
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Saved keys</h2>
      {keys.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-12 text-center">
          <Key className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-500 mb-4" />
          <p className="text-gray-500 dark:text-gray-400">No API keys stored. Add one above.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {keys.map((k) => (
            <li
              key={k.id}
              className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4 flex items-center justify-between gap-4"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900 dark:text-white">{k.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-mono truncate">
                  {visibleId === k.id ? k.value : mask(k.value)}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setVisibleId((v) => (v === k.id ? null : k.id))}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg"
                  aria-label={visibleId === k.id ? "Hide" : "Show"}
                >
                  {visibleId === k.id ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => remove(k.id)}
                  className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg"
                  aria-label="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default IntegrationsApiKeysPage;
