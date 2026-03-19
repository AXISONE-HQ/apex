"use client";

import { ChangeEvent, ReactNode, useState } from "react";
import { GuardianTable } from "@/components/guardians/GuardianTable";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/State";
import { ApiError } from "@/lib/api-client";
import { useCreateGuardian, useGuardians } from "@/queries/guardians";

interface GuardiansPageClientProps {
  orgId: string;
}

const initialForm = {
  firstName: "",
  lastName: "",
  displayName: "",
  email: "",
  phone: "",
  relationship: "",
  notes: "",
};

export function GuardiansPageClient({ orgId }: GuardiansPageClientProps) {
  const { data, isLoading, isError, refetch } = useGuardians(orgId);
  const createGuardian = useCreateGuardian(orgId);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formValues, setFormValues] = useState(initialForm);
  const [formError, setFormError] = useState<string | null>(null);

  if (isLoading) return <LoadingState message="Loading guardians" />;
  if (isError) return <ErrorState message="Unable to load guardians" onRetry={() => refetch()} />;

  const guardians = data ?? [];
  const canSubmit = Boolean(
    formValues.firstName.trim() && formValues.lastName.trim() && formValues.email.trim()
  );

  const handleFieldChange = (field: keyof typeof formValues) => (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormValues((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    setFormError(null);
    try {
      await createGuardian.mutateAsync({
        firstName: formValues.firstName,
        lastName: formValues.lastName,
        displayName: formValues.displayName || undefined,
        email: formValues.email,
        phone: formValues.phone || undefined,
        relationship: formValues.relationship || undefined,
        notes: formValues.notes || undefined,
      });
      setFormValues(initialForm);
      setIsModalOpen(false);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Unable to create guardian");
    }
  };

  const openModal = () => {
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (createGuardian.isPending) return;
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-[var(--color-navy-900)]">Guardians</h1>
          <p className="text-sm text-[var(--color-navy-500)]">Review and manage guardian links</p>
        </div>
        <Button onClick={openModal}>Create guardian</Button>
      </div>

      {guardians.length ? (
        <GuardianTable guardians={guardians} />
      ) : (
        <EmptyState message="No guardians found" actionLabel="Create guardian" onAction={openModal} />
      )}

      <Modal open={isModalOpen} onClose={closeModal} title="Create guardian">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="First name" required>
              <Input
                value={formValues.firstName}
                onChange={handleFieldChange("firstName")}
                required
                disabled={createGuardian.isPending}
              />
            </FormField>
            <FormField label="Last name" required>
              <Input
                value={formValues.lastName}
                onChange={handleFieldChange("lastName")}
                required
                disabled={createGuardian.isPending}
              />
            </FormField>
          </div>
          <FormField label="Display name">
            <Input
              value={formValues.displayName}
              onChange={handleFieldChange("displayName")}
              disabled={createGuardian.isPending}
            />
          </FormField>
          <FormField label="Email" required>
            <Input
              type="email"
              value={formValues.email}
              onChange={handleFieldChange("email")}
              required
              disabled={createGuardian.isPending}
            />
          </FormField>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Phone">
              <Input
                value={formValues.phone}
                onChange={handleFieldChange("phone")}
                disabled={createGuardian.isPending}
              />
            </FormField>
            <FormField label="Relationship">
              <Input
                value={formValues.relationship}
                onChange={handleFieldChange("relationship")}
                disabled={createGuardian.isPending}
              />
            </FormField>
          </div>
          <FormField label="Notes">
            <textarea
              className="mt-1 w-full rounded-xl border border-[var(--color-navy-200)] px-3 py-2 text-sm text-[var(--color-navy-900)] focus:outline-none focus:ring-2 focus:ring-[var(--color-blue-300)]"
              rows={3}
              value={formValues.notes}
              onChange={handleFieldChange("notes")}
              disabled={createGuardian.isPending}
            />
          </FormField>
          {formError ? <p className="text-sm text-[var(--color-red-600)]">{formError}</p> : null}
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={closeModal}
              disabled={createGuardian.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!canSubmit || createGuardian.isPending}>
              {createGuardian.isPending ? "Creating…" : "Create guardian"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function FormField({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm text-[var(--color-navy-700)]">
      <span className="text-xs uppercase tracking-wide text-[var(--color-navy-400)]">
        {label}
        {required ? " *" : ""}
      </span>
      {children}
    </label>
  );
}
