import React, { useState, useEffect } from "react";
import { FileText, Sparkles, Download, Printer, Loader2, ChevronRight, ArrowLeft } from "lucide-react";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS, BASE_URL } from "../../utils/apiPaths";
import { useAuth } from "../../context/AuthContext";

const PM_DOCUMENT_LIST = [
  { id: "project-charter", name: "Project Charter" },
  { id: "stakeholder-register", name: "Stakeholder Register" },
  { id: "scope-statement", name: "Scope Statement" },
  { id: "work-breakdown-structure", name: "Work Breakdown Structure (WBS)" },
  { id: "risk-management-plan", name: "Risk Management Plan" },
  { id: "resource-management-plan", name: "Resource Management Plan" },
  { id: "schedule-baseline", name: "Schedule Baseline" },
  { id: "cost-baseline", name: "Cost Baseline" },
  { id: "quality-management-plan", name: "Quality Management Plan" },
  { id: "communications-management-plan", name: "Communications Management Plan" },
  { id: "procurement-management-plan", name: "Procurement Management Plan" },
  { id: "change-management-plan", name: "Change Management Plan" },
];

export default function ProjectDocumentsPage() {
  const { user } = useAuth();
  const [step, setStep] = useState("list"); // "list" | "form" | "result"
  const [selectedType, setSelectedType] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [docName, setDocName] = useState("");
  const [answers, setAnswers] = useState({});
  const [content, setContent] = useState("");
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  const openWizard = (doc) => {
    setSelectedType(doc.id);
    setDocName(doc.name);
    setStep("form");
    setQuestions([]);
    setAnswers({});
    setContent("");
    setError("");
  };

  useEffect(() => {
    if (step !== "form" || !selectedType) return;
    setLoadingQuestions(true);
    setError("");
    axiosInstance
      .get(API_PATHS.AI.PROJECT_DOCUMENT_QUESTIONS(selectedType))
      .then((res) => {
        setQuestions(res.data?.questions || []);
        const initial = {};
        (res.data?.questions || []).forEach((q) => {
          initial[q.id] = "";
        });
        setAnswers(initial);
      })
      .catch((err) => {
        setError(err.response?.data?.message || "Failed to load questions.");
        setQuestions([]);
      })
      .finally(() => setLoadingQuestions(false));
  }, [step, selectedType]);

  const handleGenerate = async () => {
    if (!selectedType) return;
    setGenerating(true);
    setError("");
    try {
      const res = await axiosInstance.post(API_PATHS.AI.PROJECT_DOCUMENT_GENERATE, {
        documentType: selectedType,
        answers,
      });
      setContent(res.data?.content ?? "");
      setStep("result");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to generate document. Try again.");
    } finally {
      setGenerating(false);
    }
  };

  const getLetterheadHtml = () => {
    const logoUrl = user?.companyLogo && String(user.companyLogo).trim();
    const logoHtml = logoUrl
      ? `<img src="${logoUrl.startsWith("http") ? logoUrl : BASE_URL + logoUrl.replace(/^\/+/, "")}" alt="Company Logo" style="max-width:180px;max-height:70px;object-fit:contain;margin-bottom:8px;" />`
      : "";
    const nameHtml = user?.businessName
      ? `<div style="font-size:20px;font-weight:bold;color:#111;">${user.businessName}</div>`
      : "";
    const contactParts = [
      user?.address,
      user?.phone,
      user?.email,
    ].filter(Boolean);
    const contactHtml =
      contactParts.length > 0
        ? `<div style="font-size:11px;color:#444;margin-top:4px;">${contactParts.join(" &nbsp;|&nbsp; ")}</div>`
        : "";
    const headerContent = [logoHtml, nameHtml, contactHtml].filter(Boolean).join("");
    return headerContent
      ? `<div style="text-align:left;border-bottom:2px solid #333;padding-bottom:16px;margin-bottom:20px;">${headerContent}</div>`
      : "";
  };

  const handleExportPdf = () => {
    if (!content.trim()) return;
    const letterhead = getLetterheadHtml();
    const titleHtml = `<h1 style="font-size:22px;font-weight:bold;color:#111;margin-bottom:16px;font-family:Georgia,serif;">${docName}</h1>`;
    const bodyHtml = content
      .split(/\n\n+/)
      .map((p) => {
        const trimmed = p.trim();
        if (!trimmed) return "";
        if (/^#+\s/.test(trimmed)) {
          const level = trimmed.match(/^#+/)[0].length;
          const text = trimmed.replace(/^#+\s*/, "");
          const size = level === 1 ? "18px" : level === 2 ? "16px" : "14px";
          return `<h${Math.min(level, 3)} style="font-size:${size};font-weight:bold;margin-top:12px;margin-bottom:6px;font-family:Georgia,serif;">${text}</h${Math.min(level, 3)}>`;
        }
        return `<p style="margin-bottom:10px;line-height:1.6;font-family:Georgia,serif;">${trimmed.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`;
      })
      .filter(Boolean)
      .join("");
    const footerHtml = `<div style="margin-top:24px;padding-top:12px;border-top:1px solid #ddd;font-size:10px;color:#666;">Generated: ${new Date().toLocaleDateString(undefined, { dateStyle: "long" })}</div>`;
    const html = `<!DOCTYPE html><html><head><title>${docName}</title>
<meta charset="utf-8">
<style>
  body { font-family: Georgia, serif; max-width: 800px; margin: 2rem auto; padding: 40px; line-height: 1.6; color: #111; }
  @media print { body { padding: 20px; } }
</style>
</head><body>
${letterhead}
${titleHtml}
<div class="content">${bodyHtml}</div>
${footerHtml}
</body></html>`;
    const win = window.open("", "_blank");
    if (!win) {
      setError("Allow popups to export PDF.");
      return;
    }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
      win.close();
    }, 300);
  };

  const handleExportDocx = async () => {
    if (!content.trim()) return;
    setExporting(true);
    setError("");
    try {
      const res = await axiosInstance.post(
        API_PATHS.DOCUMENTS.EXPORT_DOCX,
        { content, filename: `${(docName || "document").replace(/\s+/g, "-")}.docx` },
        { responseType: "blob" }
      );
      const blob = new Blob([res.data], {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(docName || "document").replace(/\s+/g, "-")}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to export Word.");
    } finally {
      setExporting(false);
    }
  };

  const backToList = () => {
    setStep("list");
    setSelectedType(null);
    setQuestions([]);
    setAnswers({});
    setContent("");
    setError("");
  };

  const backToForm = () => {
    setStep("form");
    setContent("");
    setError("");
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-slate-800 px-4 py-3 mb-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Project Management Documents
        </h2>
        <p className="text-sm text-white mt-1">
          AI-assisted generation for charters, plans, and baselines. Answer a few questions, then generate and export with your company letterhead as PDF or Word.
        </p>
      </div>

      <div className="rounded-lg bg-slate-800 px-4 py-6 text-white">
        {step === "list" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PM_DOCUMENT_LIST.map((doc) => (
              <button
                key={doc.id}
                type="button"
                onClick={() => openWizard(doc)}
                className="flex items-center justify-between gap-3 p-4 rounded-lg border border-slate-600 bg-slate-700 hover:border-slate-500 hover:bg-slate-600 text-left transition-all"
              >
                <span className="font-medium text-white">{doc.name}</span>
                <ChevronRight className="w-5 h-5 text-slate-300 flex-shrink-0" />
              </button>
            ))}
          </div>
        )}

        {step === "form" && (
          <div className="max-w-2xl">
            <button
              type="button"
              onClick={backToList}
              className="flex items-center gap-2 text-sm text-white hover:text-slate-200 mb-4"
            >
              <ArrowLeft className="w-4 h-4" /> Back to documents
            </button>
            <h3 className="text-xl font-semibold text-white mb-2">{docName}</h3>
            <p className="text-sm text-white mb-6">
              Answer the questions below. The AI will use your answers to generate a professional document. You can edit the result before exporting.
            </p>
            {loadingQuestions ? (
              <div className="flex items-center gap-2 text-white">
                <Loader2 className="w-5 h-5 animate-spin" /> Loading questions…
              </div>
            ) : (
              <>
                <div className="space-y-4 mb-6">
                  {questions.map((q) => (
                    <div key={q.id}>
                      <label className="block text-sm font-medium text-white mb-1">
                        {q.label}
                        {q.required && <span className="text-red-400"> *</span>}
                      </label>
                      <textarea
                        value={answers[q.id] ?? ""}
                        onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                        placeholder={q.placeholder}
                        rows={3}
                        className="w-full border border-slate-600 rounded-lg px-3 py-2 text-sm bg-slate-700 text-white placeholder-slate-400"
                      />
                    </div>
                  ))}
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={generating || questions.length === 0}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 text-sm font-medium"
                  >
                    {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {generating ? "Generating…" : "Generate with AI"}
                  </button>
                  <button
                    type="button"
                    onClick={backToList}
                    className="px-4 py-2 border border-white text-white rounded-lg hover:bg-white/10 text-sm font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
            {error && <p className="mt-4 text-sm text-red-300">{error}</p>}
          </div>
        )}

        {step === "result" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <button
                type="button"
                onClick={backToForm}
                className="flex items-center gap-2 text-sm text-white hover:text-slate-200"
              >
                <ArrowLeft className="w-4 h-4" /> Edit answers and regenerate
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleExportPdf}
                  disabled={!content.trim()}
                  className="inline-flex items-center gap-1 px-3 py-1.5 border border-white text-white rounded-lg hover:bg-white/10 disabled:opacity-50 text-sm font-medium"
                >
                  <Printer className="w-4 h-4" /> Export PDF
                </button>
                <button
                  type="button"
                  onClick={handleExportDocx}
                  disabled={!content.trim() || exporting}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-700 text-white border border-white rounded-lg hover:bg-slate-600 disabled:opacity-50 text-sm font-medium"
                >
                  {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  Export Word
                </button>
              </div>
            </div>
            <label className="block text-sm font-medium text-white">Document content (edit as needed)</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Generated content will appear here."
              rows={20}
              className="w-full border border-slate-600 rounded-lg px-3 py-2 font-mono text-sm whitespace-pre-wrap bg-slate-700 text-white placeholder-slate-400"
            />
            {error && <p className="text-sm text-red-300">{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
