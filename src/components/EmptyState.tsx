export function EmptyState({ message = "Upload a CSV to see results." }: { message?: string }) {
  return (
    <div className="border border-dashed border-border rounded-md px-6 py-16 text-center">
      <p className="text-xs text-muted-foreground">{message}</p>
    </div>
  );
}
