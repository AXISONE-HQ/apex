"use client";

import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "../../../../lib/firebaseClient";

const defaultForm = {
  name: "",
  slug: "",
  state_province: "",
  country: "",
  contactName: "",
  contactEmail: "",
  sport: "",
  notes: ""
};

type FormState = typeof defaultForm;

type CheckItem = {
  label: string;
  description?: string;
};

const checklist: CheckItem[] = [
  { label: "Club contract / MSA signed" },
  { label: "Billing plan selected" },
  { label: "Primary contact identified" },
  { label: "Initial teams import ready" },
  { label: "Coach onboarding plan scheduled" }
];

export default function AdminOnboardingPage() {
  const [form, setForm] = useState<FormState>(defaultForm);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function ensureSuperAdmin() {
      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        credentials: "include"
      });
      if (res.status === 401) {
        setAuthError("Please log in to continue.");
        setLoading(false);
        return;
      }
      const me = await res.json();
      const roles: string[] = me.roles || [];
      const allowed = roles.includes("AxisOneAdmin") || roles.includes("SuperAdmin");
      if (!allowed) {
        setAuthError("This page is restricted to AxisOne Admin and SuperAdmin roles.");
      }
      setLoading(false);
    }

    ensureSuperAdmin();
  }, []);

  const formValid = useMemo(() => {
    return form.name.trim().length > 0 && form.slug.trim().length > 0 && form.country.trim().length > 0;
  }, [form]);

  const handleChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formValid) return;

    setStatus("saving");
    setErrorMessage(null);

    try {
      const res = await fetch(`${API_BASE_URL}/admin/clubs/onboarding`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form)
      });

      if (!res.ok) {
        throw new Error(`Failed to create club (${res.status})`);
      }

      setStatus("saved");
      setForm(defaultForm);
      setTimeout(() => setStatus("idle"), 4000);
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Unexpected error");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#040215] text-white flex items-center justify-center">
        <p className="text-sm text-white/60">Loading onboarding console...</p>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="min-h-screen bg-[#040215] text-white flex items-center justify-center">
        <p className="text-sm text-white/60">{authError}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#040215] text-white px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8">
          <p className="text-xs uppercase tracking-[0.3em] text-[#c7b6ff]">AxisOne Admin</p>
          <h1 className="mt-2 text-3xl font-semibold">Club Onboarding</h1>
          <p className="mt-1 text-sm text-white/60">
            Capture everything needed to activate a new club on the platform.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-3">
          <form className="md:col-span-2 rounded-3xl border border-white/10 bg-white/5 p-6" onSubmit={handleSubmit}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold">Club details</h2>
                <p className="text-xs text-white/60">All fields marked* are required</p>
              </div>
              {status === "saving" && <span className="text-xs text-white/60">Saving...</span>}
              {status === "saved" && <span className="text-xs text-emerald-400">Saved!</span>}
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <label className="block text-white/70 mb-1">Club name*</label>
                <input
                  className="w-full rounded-xl border border-white/20 bg-black/20 px-3 py-2"
                  value={form.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-white/70 mb-1">Slug*</label>
                <input
                  className="w-full rounded-xl border border-white/20 bg-black/20 px-3 py-2"
                  placeholder="demo-club"
                  value={form.slug}
                  onChange={(e) => handleChange("slug", e.target.value.replace(/\s+/g, "-").toLowerCase())}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-white/70 mb-1">State / Province</label>
                  <input
                    className="w-full rounded-xl border border-white/20 bg-black/20 px-3 py-2"
                    value={form.state_province}
                    onChange={(e) => handleChange("state_province", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-white/70 mb-1">Country*</label>
                  <input
                    className="w-full rounded-xl border border-white/20 bg-black/20 px-3 py-2"
                    value={form.country}
                    onChange={(e) => handleChange("country", e.target.value)}
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-white/70 mb-1">Primary contact</label>
                  <input
                    className="w-full rounded-xl border border-white/20 bg-black/20 px-3 py-2"
                    value={form.contactName}
                    onChange={(e) => handleChange("contactName", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-white/70 mb-1">Contact email</label>
                  <input
                    className="w-full rounded-xl border border-white/20 bg-black/20 px-3 py-2"
                    type="email"
                    value={form.contactEmail}
                    onChange={(e) => handleChange("contactEmail", e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="block text-white/70 mb-1">Sport</label>
                <input
                  className="w-full rounded-xl border border-white/20 bg-black/20 px-3 py-2"
                  value={form.sport}
                  onChange={(e) => handleChange("sport", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-white/70 mb-1">Notes</label>
                <textarea
                  className="w-full rounded-xl border border-white/20 bg-black/20 px-3 py-2"
                  rows={4}
                  value={form.notes}
                  onChange={(e) => handleChange("notes", e.target.value)}
                />
              </div>
            </div>

            {errorMessage && <p className="mt-4 text-xs text-rose-400">{errorMessage}</p>}

            <button
              type="submit"
              disabled={!formValid || status === "saving"}
              className="mt-6 w-full rounded-xl bg-white/90 py-3 text-sm font-semibold text-black disabled:opacity-50"
            >
              Save onboarding packet
            </button>
          </form>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <h3 className="text-lg font-semibold mb-4">Onboarding checklist</h3>
            <ul className="space-y-3 text-sm">
              {checklist.map((item) => (
                <li key={item.label} className="flex items-start gap-3">
                  <input type="checkbox" className="mt-1" />
                  <div>
                    <p className="font-medium">{item.label}</p>
                    {item.description && <p className="text-xs text-white/60">{item.description}</p>}
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4 text-xs text-white/70">
              Store links to contracts, plan approvals, and kickoff notes here so the next admin picks up where you left off.
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
