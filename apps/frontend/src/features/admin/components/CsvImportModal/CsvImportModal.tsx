"use client";

import { useRef, useState } from "react";
import { useCsvImport } from "../../hooks/useCsvImport";
import styles from "./CsvImportModal.module.scss";

interface CsvImportModalProps {
  onClose: () => void;
}

export function CsvImportModal({ onClose }: CsvImportModalProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const { mutate: importCsv, isPending, data: result } = useCsvImport();

  const handleSubmit = () => {
    if (file) importCsv(file);
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Import products via CSV</h2>
          <button
            onClick={onClose}
            className={styles.closeBtn}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {!result ? (
          <>
            <p className={styles.body}>
              Upload a CSV file with columns:{" "}
              <code>
                name, slug, price, cost, stock, categoryId, description
              </code>
              . The first row must be a header row.
            </p>

            <div
              className={styles.dropzone}
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const dropped = e.dataTransfer.files[0];
                if (dropped?.name.endsWith(".csv")) setFile(dropped);
              }}
            >
              {file ? (
                <p className={styles.fileName}>{file.name}</p>
              ) : (
                <p className={styles.dropPrompt}>
                  Click or drag a .csv file here
                </p>
              )}
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                className={styles.fileInput}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>

            <div className={styles.footer}>
              <button onClick={onClose} className={styles.cancelBtn}>
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!file || isPending}
                className={styles.importBtn}
              >
                {isPending ? "Importing..." : "Import"}
              </button>
            </div>
          </>
        ) : (
          <div className={styles.results}>
            <p className={styles.resultLine}>
              <strong>{result.imported}</strong> product
              {result.imported !== 1 ? "s" : ""} imported
            </p>
            {result.failed > 0 && (
              <>
                <p className={styles.resultError}>
                  {result.failed} row{result.failed !== 1 ? "s" : ""} failed
                </p>
                <ul className={styles.errorList}>
                  {result.errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </>
            )}
            <button onClick={onClose} className={styles.importBtn}>
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
