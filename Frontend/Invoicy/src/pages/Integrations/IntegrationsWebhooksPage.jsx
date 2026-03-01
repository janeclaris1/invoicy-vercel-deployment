import React, { useState, useEffect } from "react";
import { Webhook, Plus, Trash2 } from "lucide-react";

const STORAGE_KEY = "invoicy_integrations_webhooks";

const loadWebhooks = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
};

const saveWebhooks = (list) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
};

const DEFAULT_EVENTS = ["invoice.created", "invoice.paid", "invoice.overdue", "customer.created"];

const IntegrationsWebhooksPage = () => {
  const [webhooks, setWebhooks] = useState(loadWebhooks);
  const [showForm, setShowForm] = useState(false);
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [events, setEvents] = useState(["invoice.created"]);

  useEffect(() => {
    saveWebhooks(webhooks);
  }, [webhooks]);

  const toggleEvent = (ev) => {
    setEvents((prev) => (prev.includes(ev) ? prev.filter((e) => e !== ev) : [...prev, ev]));
  };

  const addWebhook = (e) => {
    e.preventDefault();
    if (!url.trim()) return;
    setWebhooks((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        url: url.trim(),
        description: description.trim() || null,
        events: [...events],
        createdAt: new Date().toISOString(),
        active: true,
      },
    ]);
    setUrl("");
    setDescription("");
    setEvents(["invoice.created"]);
    setShowForm(false);
  };

  const remove = (id) => {
    if (!window.confirm("Remove this webhook?")) return;
    setWebhooks((prev) => prev.filter((w) => w.id !== id));
  };

  const toggleActive = (id) => {
    setWebhooks((prev) => prev.map((w) => (w.id === id ? { ...w, active: !w.active } : w)));
  };

  return (
    <div>
      <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
        Configure webhook endpoints to receive events (e.g. invoice created, paid). (Demo: data is stored locally.)
      </p>

      {!showForm ? (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 mb-6"
        >
          <Plus className="w-4 h-4" />
          Add webhook
        </button>
      ) : (
        <form onSubmit={addWebhook} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Webhook className="w-5 h-5" />
            New webhook
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Endpoint URL *</label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://your-server.com/webhooks/invoicy"
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description (optional)</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Production server"
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Events</label>
              <div className="flex flex-wrap gap-2">
                {DEFAULT_EVENTS.map((ev) => (
                  <label key={ev} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50">
                    <input
                      type="checkbox"
                      checked={events.includes(ev)}
                      onChange={() => toggleEvent(ev)}
                      className="rounded text-blue-600"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{ev}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">
                Add webhook
              </button>
              <button type="button" onClick={() => { setShowForm(false); setUrl(""); setDescription(""); setEvents(["invoice.created"]); }} className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 dark:text-gray-300">
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Webhooks</h2>
      {webhooks.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-12 text-center">
          <Webhook className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-500 mb-4" />
          <p className="text-gray-500 dark:text-gray-400">No webhooks configured. Add one above.</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {webhooks.map((w) => (
            <li
              key={w.id}
              className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4"
            >
              <div className="min-w-0 flex-1">
                <p className="font-mono text-sm text-gray-900 dark:text-white break-all">{w.url}</p>
                {w.description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{w.description}</p>}
                <div className="flex flex-wrap gap-2 mt-2">
                  {(w.events || []).map((ev) => (
                    <span key={ev} className="px-2 py-0.5 rounded bg-gray-100 dark:bg-slate-700 text-xs text-gray-600 dark:text-gray-300">
                      {ev}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => toggleActive(w.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium ${w.active ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" : "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400"}`}
                >
                  {w.active ? "Active" : "Paused"}
                </button>
                <button
                  type="button"
                  onClick={() => remove(w.id)}
                  className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg"
                  aria-label="Remove webhook"
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

export default IntegrationsWebhooksPage;
