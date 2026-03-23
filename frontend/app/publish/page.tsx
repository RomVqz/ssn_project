"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { usePublishPaper } from "@/hooks/usePublishPaper";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";

type Step = "metadata" | "upload" | "sign" | "done";

const FIELDS = [
  "Biology", "Chemistry", "Computer Science", "Economics",
  "Mathematics", "Medicine", "Physics", "Psychology", "Other"
];

export default function PublishPage() {
  const { connected } = useWallet();
  const router = useRouter();
  const { publish, loading } = usePublishPaper();

  const [step, setStep] = useState<Step>("metadata");
  const [form, setForm] = useState({
    title: "",
    authorsRaw: "",
    abstract: "",
    field: "",
    fundingGoal: "",
    pdfFile: null as File | null,
  });
  const [pdfCid, setPdfCid] = useState("");
  const [metaCid, setMetaCid] = useState("");

  const update = (k: string, v: string | File | null) =>
    setForm((f) => ({ ...f, [k]: v }));

  // ── Step 1: Validate form ──────────────────────────────────────────────────
  async function handleNext() {
    if (!form.title.trim()) return toast.error("Title is required");
    if (!form.authorsRaw.trim()) return toast.error("At least one author is required");
    if (!form.abstract.trim() || form.abstract.length < 50)
      return toast.error("Abstract must be at least 50 characters");
    if (!form.field) return toast.error("Select a research field");
    if (!form.pdfFile) return toast.error("Please upload a PDF");
    setStep("upload");
    await handleUpload();
  }

  // ── Step 2: Upload to IPFS ──────────────────────────────────────────────────
  async function handleUpload() {
    const toastId = toast.loading("Pinning PDF to IPFS…");
    try {
      // Upload PDF via Pinata (using public API key from env)
      const pinRes = await uploadToPinata(form.pdfFile!);
      setPdfCid(pinRes);

      toast.loading("Pinning metadata…", { id: toastId });

      const metaRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/ipfs/paper-metadata`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          authors: form.authorsRaw.split(",").map((a) => a.trim()),
          abstract: form.abstract,
          field: form.field,
          pdfCid: pinRes,
        }),
      });
      const metaData = await metaRes.json();
      setMetaCid(metaData.data.cid);

      toast.success("Files pinned to IPFS!", { id: toastId });
      setStep("sign");
    } catch {
      toast.error("IPFS upload failed", { id: toastId });
      setStep("metadata");
    }
  }

  // ── Step 3: Sign & send transaction ────────────────────────────────────────
  async function handlePublish() {
    const toastId = toast.loading("Waiting for wallet signature…");
    try {
      const paperId = await publish({
        title: form.title,
        authors: form.authorsRaw.split(",").map((a) => a.trim()),
        abstractCid: metaCid,
        pdfCid,
        field: form.field,
        fundingGoalSol: Number(form.fundingGoal) || 0,
      });

      toast.success("Paper published on-chain! 🎉", { id: toastId });
      setStep("done");
      setTimeout(() => router.push(`/papers/${paperId}`), 2000);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Transaction failed", { id: toastId });
    }
  }

  if (!connected) {
    return (
      <div className="max-w-xl mx-auto px-6 py-24 text-center">
        <div className="text-5xl mb-5">🔬</div>
        <h1 className="font-display text-3xl text-[var(--text-primary)] mb-3">Publish Research</h1>
        <p className="text-[var(--text-secondary)] mb-8">
          Connect your Phantom wallet to publish a paper on-chain.
        </p>
        <WalletMultiButton />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 animate-fade-in">
      <h1 className="font-display text-3xl text-[var(--text-primary)] mb-2">Publish Research</h1>
      <p className="text-[var(--text-secondary)] mb-8">
        Your paper will be stored on IPFS and registered on Solana devnet.
      </p>

      {/* Progress steps */}
      <StepIndicator current={step} />

      {/* ── Step: Metadata ──────────────────────────────────────────────── */}
      {(step === "metadata" || step === "upload") && (
        <div className="card p-7 space-y-5">
          <div>
            <label className="block text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1.5 font-mono">
              Title *
            </label>
            <input
              className="input-field"
              placeholder="e.g. Quantum Entanglement in Biological Systems"
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              maxLength={200}
            />
          </div>

          <div>
            <label className="block text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1.5 font-mono">
              Authors * <span className="normal-case text-[var(--text-muted)]">(comma-separated)</span>
            </label>
            <input
              className="input-field"
              placeholder="Alice Researcher, Bob Scientist"
              value={form.authorsRaw}
              onChange={(e) => update("authorsRaw", e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1.5 font-mono">
              Abstract * <span className="normal-case text-[var(--text-muted)]">(min 50 chars)</span>
            </label>
            <textarea
              className="input-field resize-none"
              rows={5}
              placeholder="Summarize your research findings…"
              value={form.abstract}
              onChange={(e) => update("abstract", e.target.value)}
            />
            <div className="text-right text-xs text-[var(--text-muted)] mt-1 font-mono">
              {form.abstract.length} chars
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1.5 font-mono">
                Field *
              </label>
              <select
                className="input-field"
                value={form.field}
                onChange={(e) => update("field", e.target.value)}
              >
                <option value="">Select field…</option>
                {FIELDS.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1.5 font-mono">
                Funding Goal (SOL)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="input-field"
                placeholder="0 = no goal"
                value={form.fundingGoal}
                onChange={(e) => update("fundingGoal", e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1.5 font-mono">
              PDF File *
            </label>
            <div
              className="border-2 border-dashed border-[var(--bg-border)] rounded-lg p-6 text-center cursor-pointer hover:border-amber-500/40 transition-colors"
              onClick={() => document.getElementById("pdf-input")?.click()}
            >
              {form.pdfFile ? (
                <div className="text-sm text-amber-400 font-mono">
                  📄 {form.pdfFile.name} ({(form.pdfFile.size / 1024 / 1024).toFixed(2)} MB)
                </div>
              ) : (
                <>
                  <div className="text-2xl mb-2">📄</div>
                  <p className="text-sm text-[var(--text-secondary)]">Click to upload PDF</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">Max 10 MB</p>
                </>
              )}
            </div>
            <input
              id="pdf-input"
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => update("pdfFile", e.target.files?.[0] ?? null)}
            />
          </div>

          <button
            className="btn-primary w-full justify-center"
            onClick={handleNext}
            disabled={loading || step === "upload"}
          >
            {step === "upload" ? (
              <>
                <Spinner /> Uploading to IPFS…
              </>
            ) : (
              "Continue →"
            )}
          </button>
        </div>
      )}

      {/* ── Step: Sign ──────────────────────────────────────────────────── */}
      {step === "sign" && (
        <div className="card p-7 text-center">
          <div className="w-14 h-14 rounded-full bg-[rgba(245,158,11,0.1)] flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
              <path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/>
            </svg>
          </div>
          <h2 className="font-display text-xl text-[var(--text-primary)] mb-2">Files Pinned to IPFS</h2>
          <p className="text-sm text-[var(--text-secondary)] mb-6">
            Sign the Solana transaction to register your paper on-chain.
          </p>
          <div className="bg-[var(--bg-card)] rounded-lg p-4 text-left mb-6 space-y-2 text-xs font-mono">
            <div className="flex gap-2">
              <span className="text-[var(--text-muted)]">PDF CID</span>
              <span className="text-teal-400 truncate">{pdfCid}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-[var(--text-muted)]">META CID</span>
              <span className="text-teal-400 truncate">{metaCid}</span>
            </div>
          </div>
          <button
            className="btn-primary w-full justify-center"
            onClick={handlePublish}
            disabled={loading}
          >
            {loading ? <><Spinner /> Signing…</> : "Sign & Publish on Solana"}
          </button>
        </div>
      )}

      {/* ── Step: Done ──────────────────────────────────────────────────── */}
      {step === "done" && (
        <div className="card p-10 text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="font-display text-2xl text-[var(--text-primary)] mb-2">Published!</h2>
          <p className="text-[var(--text-secondary)] text-sm">
            Redirecting to your paper…
          </p>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

const STEPS: { key: Step; label: string }[] = [
  { key: "metadata", label: "Metadata" },
  { key: "upload", label: "IPFS Upload" },
  { key: "sign", label: "Sign" },
  { key: "done", label: "Published" },
];

function StepIndicator({ current }: { current: Step }) {
  const currentIdx = STEPS.findIndex((s) => s.key === current);
  return (
    <div className="flex items-center gap-2 mb-8">
      {STEPS.map((s, i) => (
        <div key={s.key} className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold transition-all
            ${i < currentIdx ? "bg-amber-500 text-lab-950"
              : i === currentIdx ? "bg-amber-500/20 text-amber-400 ring-1 ring-amber-500"
              : "bg-[var(--bg-card)] text-[var(--text-muted)] border border-[var(--bg-border)]"}`}>
            {i < currentIdx ? "✓" : i + 1}
          </div>
          <span className={`text-xs font-mono hidden sm:block
            ${i === currentIdx ? "text-amber-400" : "text-[var(--text-muted)]"}`}>
            {s.label}
          </span>
          {i < STEPS.length - 1 && (
            <div className={`h-px w-8 ${i < currentIdx ? "bg-amber-500" : "bg-[var(--bg-border)]"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeLinecap="round"/>
    </svg>
  );
}

// Minimal Pinata direct upload (uses JWT from env)
async function uploadToPinata(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  form.append("pinataMetadata", JSON.stringify({ name: file.name }));

  const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.NEXT_PUBLIC_PINATA_JWT}`,
    },
    body: form,
  });

  if (!res.ok) throw new Error("Pinata upload failed");
  const data = await res.json();
  return data.IpfsHash;
}
