interface BaseStateProps {
  message: string;
}

interface ErrorStateProps extends BaseStateProps {
  retryLabel?: string;
  onRetry?: () => void;
}

interface EmptyStateProps extends BaseStateProps {
  actionLabel?: string;
  onAction?: () => void;
}

type LoadingStateProps = BaseStateProps;

export function LoadingState({ message }: LoadingStateProps) {
  return (
    <div className="rounded-2xl border border-[var(--color-navy-200)] bg-white p-6 shadow-sm">
      <div className="h-4 w-1/3 animate-pulse rounded bg-[var(--color-navy-100)]" />
      <p className="mt-4 text-sm text-[var(--color-navy-500)]">{message}</p>
    </div>
  );
}

export function ErrorState({ message, retryLabel = "Retry", onRetry }: ErrorStateProps) {
  return (
    <div className="rounded-2xl border border-[var(--color-red-200,#fecaca)] bg-white p-6 text-[var(--color-red-700)]">
      <p className="text-sm font-medium">{message}</p>
      {onRetry ? (
        <button
          className="mt-3 text-sm font-semibold text-[var(--color-blue-600)] hover:underline"
          onClick={onRetry}
        >
          {retryLabel}
        </button>
      ) : null}
    </div>
  );
}

export function EmptyState({ message, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--color-navy-200)] bg-[var(--color-background)] p-6 text-center">
      <p className="text-sm text-[var(--color-navy-500)]">{message}</p>
      {actionLabel && onAction ? (
        <button
          className="mt-3 text-sm font-semibold text-[var(--color-blue-600)] hover:underline"
          onClick={onAction}
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
