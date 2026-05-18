import { createFileRoute } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/DashboardLayout";
import { UploadZone } from "@/components/UploadZone";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Upload — Model Evaluation Dashboard" },
      { name: "description", content: "Upload prediction CSVs to evaluate model performance." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto px-8 py-12">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">Upload</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Drop a predictions file to begin evaluating your model.
          </p>
        </header>
        <UploadZone />
      </div>
    </DashboardLayout>
  );
}
