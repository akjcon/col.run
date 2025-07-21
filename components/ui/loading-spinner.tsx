interface LoadingSpinnerProps {
  message?: string;
}

export function LoadingSpinner({
  message = "Loading...",
}: LoadingSpinnerProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="text-center">
        <div className="mx-auto mb-4 h-6 w-6 animate-spin rounded-full border-2 border-neutral-900 border-t-transparent"></div>
        <p className="text-sm text-neutral-600">{message}</p>
      </div>
    </div>
  );
}
