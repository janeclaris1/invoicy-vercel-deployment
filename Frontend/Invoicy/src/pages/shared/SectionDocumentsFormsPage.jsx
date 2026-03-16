import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import { FileText, Sparkles, Download, Printer, Loader2 } from "lucide-react";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";

const sectionLabel = { projects: "Project Management", production: "Production & Operations", supply_chain: "Supply Chain & Inventory" };

const TEMPLATES = {
  projects: [
    { id: "statement-of-work", name: "Statement of Work (SOW)" },
    { id: "project-charter", name: "Project Charter" },
    { id: "change-order", name: "Change Order Form" },
    { id: "nda", name: "Non-Disclosure Agreement (Project)" },
    { id: "project-closeout", name: "Project Closeout Report" },
  ],
  production: [
    { id: "work-order-form", name: "Work Order Form" },
    { id: "quality-checklist", name: "Quality Inspection Checklist" },
    { id: "safety-compliance", name: "Safety & Compliance Acknowledgement" },
    { id: "maintenance-log", name: "Equipment Maintenance Log" },
    { id: "production-contract", name: "Production / Manufacturing Agreement" },
  ],
  supply_chain: [
    { id: "purchase-order", name: "Purchase Order" },
    { id: "supplier-agreement", name: "Supplier Agreement" },
    { id: "delivery-terms", name: "Delivery Terms & Conditions" },
    { id: "inventory-policy", name: "Inventory Management Policy" },
    { id: "procurement-policy", name: "Procurement Policy" },
  ],
};

const CONTEXT_PROMPTS = {
  projects: "e.g. Project name, client, scope, timeline, budget",
  production: "e.g. Product name, order number, equipment, company name",
  supply_chain: "e.g. Supplier name, PO number, delivery address, company name",
};

export default function SectionDocumentsFormsPage() {
  const location = useLocation();
  const section = location.pathname.startsWith("/projects") ? "projects" : location.pathname.startsWith("/production") ? "production" : "supply_chain";
  const templates = TEMPLATES[section] || [];
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [contextText, setContextText] = useState("");
  const [content, setContent] = useState("");
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    if (!selectedTemplate) {
      setError("Select a document type first.");
      return;
    }
    setGenerating(true);
    setError("");
    try {
      const context = contextText.trim() ? { details: contextText.trim() } : {};
      const res = await axiosInstance.post(API_PATHS.AI.GENERATE_DOCUMENT, {
        domain: section,
        templateId: selectedTemplate,
        context,
      });
      setContent(res.data?.content ?? "");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to generate document. Try again.");
    } finally {
      setGenerating(false);
    }
  };

  const handleExportPdf = () => {
    if (!content.trim()) return;
    const win = window.open("", "_blank");
    if (!win) {
      setError("Allow popups to export PDF.");
      return;
    }
    win.document.write(`
      <!DOCTYPE html><html><head><title>Document</title>
      <style>body{ font-family: Georgia, serif; max-width: 800px; margin: 2rem auto; padding: 1rem; line-height: 1.6; white-space: pre-wrap; }</style>
      </head><body><pre>${content.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre></body></html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
      win.close();
    }, 250);
  };

  const handleExportDocx = async () => {
    if (!content.trim()) return;
    setExporting(true);
    setError("");
    try {
      const res = await axiosInstance.post(
        API_PATHS.DOCUMENTS.EXPORT_DOCX,
        { content, filename: (templates.find((t) => t.id === selectedTemplate)?.name || "document").replace(/\s+/g, "-") + ".docx" },
        { responseType: "blob" }
      );
      const blob = new Blob([res.data], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = (templates.find((t) => t.id === selectedTemplate)?.name || "document").replace(/\s+/g, "-") + ".docx";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to export DOCX.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-slate-800 px-4 py-3 mb-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Documents & Forms – {sectionLabel[section]}
        </h2>
        <p className="text-sm text-slate-200 mt-1">
        Choose a template, add context for the AI, then generate. Edit the result and export as PDF or Word.
      </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700">Document type</label>
          <select
            value={selectedTemplate}
            onChange={(e) => setSelectedTemplate(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white"
          >
            <option value="">Select a template…</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <label className="block text-sm font-medium text-gray-700">Context for AI (optional)</label>
          <textarea
            value={contextText}
            onChange={(e) => setContextText(e.target.value)}
            placeholder={CONTEXT_PROMPTS[section]}
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating || !selectedTemplate}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {generating ? "Generating…" : "Generate with AI"}
          </button>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700">Document content (edit as needed)</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleExportPdf}
                disabled={!content.trim()}
                className="inline-flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 text-sm"
              >
                <Printer className="w-4 h-4" /> Export PDF
              </button>
              <button
                type="button"
                onClick={handleExportDocx}
                disabled={!content.trim() || exporting}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-800 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 text-sm"
              >
                {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Export Word
              </button>
            </div>
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Generated content will appear here. You can edit before exporting."
            rows={16}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono text-sm whitespace-pre-wrap"
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
