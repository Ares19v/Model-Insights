import { useCallback, useRef, useState } from "react";
import { Upload } from "lucide-react";
import Papa from "papaparse";
import { useNavigate } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { setPredictions, type PredictionRow } from "@/lib/predictions-store";

export function UploadZone() {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (!file) return;
      setError(null);
      setFileName(file.name);

      Papa.parse<Record<string, string>>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => {
          const columns = result.meta.fields ?? [];
          const required = ["y_true", "y_pred"];
          const missing = required.filter((c) => !columns.includes(c));
          if (missing.length > 0) {
            const found = columns.length ? columns.join(", ") : "none";
            setError(
              `Missing required column${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}. Found columns: [${found}].`,
            );
            return;
          }
          const rows: PredictionRow[] = result.data
            .filter((r) => r.y_true !== undefined && r.y_pred !== undefined)
            .map((r) => {
              const row: PredictionRow = {
                y_true: String(r.y_true),
                y_pred: String(r.y_pred),
              };
              if (r.y_prob !== undefined && r.y_prob !== "") {
                const p = Number(r.y_prob);
                if (!Number.isNaN(p)) row.y_prob = p;
              }
              for (const c of columns) {
                if (c !== "y_true" && c !== "y_pred" && c !== "y_prob") {
                  row[c] = r[c];
                }
              }
              return row;
            });

          if (rows.length === 0) {
            setError("No valid rows found in the file.");
            return;
          }

          setPredictions({ fileName: file.name, rows, columns });
          navigate({ to: "/overview" });
        },
        error: (err) => setError(err.message),
      });
    },
    [navigate],
  );

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "rounded-lg border border-dashed bg-card/30 transition-colors cursor-pointer",
          "px-8 py-16 flex flex-col items-center justify-center text-center",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-muted-foreground/50 hover:bg-card/50",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div className="h-10 w-10 rounded-md border border-border flex items-center justify-center mb-4 bg-background">
          <Upload className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground">
          {fileName ?? "Upload predictions CSV"}
        </p>
        <p className="mt-1.5 text-xs text-muted-foreground">
          Expected columns: y_true, y_pred, y_prob (optional)
        </p>
      </div>
      {error && (
        <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}
    </div>
  );
}
