import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Download, Sparkles } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { UploadZone } from "@/components/UploadZone";
import { Button } from "@/components/ui/button";
import { buildSampleCsv, DEMO_COLUMNS, DEMO_ROWS } from "@/lib/demo-data";
import { setPredictions } from "@/lib/predictions-store";

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
  const navigate = useNavigate();

  const handleDownloadSample = () => {
    const csv = buildSampleCsv();
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sample_predictions.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleLoadDemo = () => {
    setPredictions({
      fileName: "demo_data.csv",
      rows: DEMO_ROWS,
      columns: DEMO_COLUMNS,
    });
    navigate({ to: "/overview" });
  };

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
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button variant="outline" size="sm" onClick={handleLoadDemo}>
            <Sparkles className="h-3.5 w-3.5" />
            Load demo data
          </Button>
          <Button variant="ghost" size="sm" onClick={handleDownloadSample}>
            <Download className="h-3.5 w-3.5" />
            Download sample CSV
          </Button>
          <span className="text-xs text-muted-foreground">
            No data? Try the app with a built-in example.
          </span>
        </div>
      </div>
    </DashboardLayout>
  );
}
