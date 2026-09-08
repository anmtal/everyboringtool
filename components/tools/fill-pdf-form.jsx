"use client";

import { useState, useEffect, useRef } from "react";
import {
  PDFDocument,
  StandardFonts,
  PDFTextField,
  PDFCheckBox,
  PDFDropdown,
  PDFRadioGroup,
  PDFOptionList,
} from "pdf-lib";
import { ENCRYPTED_MSG, isEncryptedError } from "../../lib/pdfLoad";

const NUM_FMT = new Intl.NumberFormat("en-US");

// Classify a pdf-lib form field into a shape our UI can render.
function describeField(field, index) {
  const name = field.getName();
  if (field instanceof PDFTextField) {
    return {
      id: `f${index}`,
      name,
      kind: "text",
      multiline: field.isMultiline(),
      value: field.getText() || "",
    };
  }
  if (field instanceof PDFCheckBox) {
    return {
      id: `f${index}`,
      name,
      kind: "checkbox",
      value: field.isChecked(),
    };
  }
  if (field instanceof PDFRadioGroup) {
    return {
      id: `f${index}`,
      name,
      kind: "radio",
      options: field.getOptions(),
      value: field.getSelected() || "",
    };
  }
  if (field instanceof PDFDropdown) {
    return {
      id: `f${index}`,
      name,
      kind: "dropdown",
      options: field.getOptions(),
      value: (field.getSelected() && field.getSelected()[0]) || "",
    };
  }
  if (field instanceof PDFOptionList) {
    return {
      id: `f${index}`,
      name,
      kind: "list",
      options: field.getOptions(),
      value: (field.getSelected() && field.getSelected()[0]) || "",
    };
  }
  // Buttons, signatures, and anything else we don't fill.
  return { id: `f${index}`, name, kind: "unsupported", value: "" };
}

export default function FillPdfForm() {
  const [file, setFile] = useState(null);
  const [pageCount, setPageCount] = useState(0);
  const [fields, setFields] = useState([]); // descriptors (see describeField)
  const [values, setValues] = useState({}); // fieldName -> value
  const [flatten, setFlatten] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState(null); // { url }

  const resultUrlRef = useRef("");

  useEffect(() => {
    return () => {
      if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
    };
  }, []);

  function clearResult() {
    if (resultUrlRef.current) {
      URL.revokeObjectURL(resultUrlRef.current);
      resultUrlRef.current = "";
    }
    setResult(null);
  }

  function reset() {
    setFile(null);
    setPageCount(0);
    setFields([]);
    setValues({});
    setStatus("");
    clearResult();
  }

  async function onFile(e) {
    const chosen = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!chosen) return;

    const isPdf =
      chosen.type === "application/pdf" ||
      chosen.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      setError("Please choose a PDF file.");
      reset();
      return;
    }

    setError("");
    reset();
    setBusy(true);
    setStatus("Reading form fields…");
    try {
      const bytes = await chosen.arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      const count = doc.getPageCount();
      if (!count) throw new Error("empty");

      const form = doc.getForm();
      const raw = form.getFields();
      const described = raw.map((f, i) => describeField(f, i));

      const initial = {};
      for (const d of described) initial[d.name] = d.value;

      setFile(chosen);
      setPageCount(count);
      setFields(described);
      setValues(initial);
    } catch (err) {
      setError(
        isEncryptedError(err)
          ? ENCRYPTED_MSG
          : "Couldn't read that PDF — it may be corrupted, password-protected, or not a valid PDF."
      );
      reset();
    } finally {
      setBusy(false);
      setStatus("");
    }
  }

  function setValue(name, v) {
    setValues((prev) => ({ ...prev, [name]: v }));
    clearResult();
  }

  const baseName = file ? file.name.replace(/\.[^.]+$/, "") : "document";
  const fillable = fields.filter((f) => f.kind !== "unsupported");

  async function fill() {
    if (!file) return;
    setError("");
    clearResult();
    setBusy(true);
    setStatus("Filling form…");
    try {
      const bytes = await file.arrayBuffer();
      const doc = await PDFDocument.load(bytes);
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const form = doc.getForm();

      for (const d of fields) {
        const v = values[d.name];
        try {
          if (d.kind === "text") {
            form.getTextField(d.name).setText(v == null ? "" : String(v));
          } else if (d.kind === "checkbox") {
            const box = form.getCheckBox(d.name);
            if (v) box.check();
            else box.uncheck();
          } else if (d.kind === "radio") {
            if (v) form.getRadioGroup(d.name).select(String(v));
          } else if (d.kind === "dropdown") {
            if (v) form.getDropdown(d.name).select(String(v));
          } else if (d.kind === "list") {
            if (v) form.getOptionList(d.name).select(String(v));
          }
        } catch {
          // Skip any single field that refuses a value; keep filling the rest.
        }
      }

      // Regenerate appearances so filled text renders in every viewer.
      try {
        form.updateFieldAppearances(font);
      } catch {
        /* some fields carry their own fonts; ignore */
      }

      if (flatten) form.flatten();

      const outBytes = await doc.save();
      const blob = new Blob([outBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      resultUrlRef.current = url;
      setResult({ url });
    } catch (err) {
      setError(
        isEncryptedError(err)
          ? ENCRYPTED_MSG
          : "Something went wrong filling that PDF. It may be corrupted or protected."
      );
    } finally {
      setBusy(false);
      setStatus("");
    }
  }

  const suffix = flatten ? "-filled-flat" : "-filled";

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="fpf-file">
              Choose a PDF form
            </label>
            <input
              className="tool-input"
              id="fpf-file"
              type="file"
              accept="application/pdf"
              onChange={onFile}
            />
          </div>
        </div>
      </div>

      {error && (
        <p className="tool-error" role="alert">
          {error}
        </p>
      )}

      {busy && status && (
        <p className="tool-note" role="status" aria-live="polite">
          {status}
        </p>
      )}

      {!file && !busy && (
        <p className="tool-note">
          Upload a fillable PDF (one with interactive form fields, like a tax
          form, application, or template). This tool reads its fields and lets
          you type into each one, then download the completed PDF. Everything
          happens in your browser.
        </p>
      )}

      {file && fields.length === 0 && !busy && (
        <div className="tool-result" role="status" aria-live="polite">
          <div className="tool-result-label">No form fields found</div>
          <div className="tool-result-value">
            This PDF doesn&apos;t contain interactive (AcroForm) fields, so there
            is nothing to type into. It may be a flat scan or a print-only
            layout. This tool can only fill PDFs that already have fillable
            fields.
          </div>
        </div>
      )}

      {file && fields.length > 0 && (
        <>
          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">{NUM_FMT.format(pageCount)}</div>
              <div className="tool-stat-label">
                {pageCount === 1 ? "Page" : "Pages"}
              </div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {NUM_FMT.format(fillable.length)}
              </div>
              <div className="tool-stat-label">
                {fillable.length === 1 ? "Field" : "Fields"}
              </div>
            </div>
          </div>

          <div className="tool-fields">
            {fields.map((f) => {
              if (f.kind === "unsupported") {
                return (
                  <div className="tool-row" key={f.id}>
                    <div className="tool-field">
                      <label className="tool-label">{f.name}</label>
                      <p className="tool-note">
                        Button or signature field — left unchanged.
                      </p>
                    </div>
                  </div>
                );
              }
              if (f.kind === "checkbox") {
                return (
                  <div className="tool-row" key={f.id}>
                    <div className="tool-field">
                      <label className="tool-label" htmlFor={f.id}>
                        {f.name}
                      </label>
                      <label
                        htmlFor={f.id}
                        style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}
                      >
                        <input
                          id={f.id}
                          type="checkbox"
                          checked={!!values[f.name]}
                          onChange={(e) => setValue(f.name, e.target.checked)}
                        />
                        <span className="tool-note">
                          {values[f.name] ? "Checked" : "Unchecked"}
                        </span>
                      </label>
                    </div>
                  </div>
                );
              }
              if (f.kind === "dropdown" || f.kind === "radio" || f.kind === "list") {
                const opts = f.options || [];
                return (
                  <div className="tool-row" key={f.id}>
                    <div className="tool-field">
                      <label className="tool-label" htmlFor={f.id}>
                        {f.name}
                      </label>
                      <select
                        className="tool-select"
                        id={f.id}
                        value={values[f.name] || ""}
                        onChange={(e) => setValue(f.name, e.target.value)}
                      >
                        <option value="">— Leave blank —</option>
                        {opts.map((o, oi) => (
                          <option key={oi} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              }
              // text
              return (
                <div className="tool-row" key={f.id}>
                  <div className="tool-field">
                    <label className="tool-label" htmlFor={f.id}>
                      {f.name}
                    </label>
                    {f.multiline ? (
                      <textarea
                        className="tool-textarea"
                        id={f.id}
                        rows={3}
                        value={values[f.name] || ""}
                        onChange={(e) => setValue(f.name, e.target.value)}
                      />
                    ) : (
                      <input
                        className="tool-input"
                        id={f.id}
                        type="text"
                        value={values[f.name] || ""}
                        onChange={(e) => setValue(f.name, e.target.value)}
                      />
                    )}
                  </div>
                </div>
              );
            })}

            <div className="tool-row">
              <div className="tool-field">
                <label
                  className="tool-label"
                  htmlFor="fpf-flatten"
                  style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}
                >
                  <input
                    id="fpf-flatten"
                    type="checkbox"
                    checked={flatten}
                    onChange={(e) => {
                      setFlatten(e.target.checked);
                      clearResult();
                    }}
                  />
                  <span>Flatten form (lock values so they can&apos;t be edited)</span>
                </label>
              </div>
            </div>
          </div>

          <p className="tool-note">
            Field names come straight from the PDF, so they may look technical.
            Fill in what you need and leave the rest blank. Flattening bakes your
            answers into the page — good for sending a final copy, but the form
            can no longer be changed afterward.
          </p>

          <div className="tool-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={fill}
              disabled={busy}
            >
              {busy ? "Working…" : "Fill & build PDF"}
            </button>
            {result && (
              <a
                className="btn btn-success"
                href={result.url}
                download={`${baseName}${suffix}.pdf`}
              >
                ↓ Download filled PDF
              </a>
            )}
          </div>

          {result && (
            <div className="tool-result" role="status" aria-live="polite">
              <div className="tool-result-label">Done</div>
              <div className="tool-result-value">
                Filled {NUM_FMT.format(fillable.length)}{" "}
                {fillable.length === 1 ? "field" : "fields"}
                {flatten ? " and flattened the form" : ""}. Click download to
                save your copy.
              </div>
            </div>
          )}
        </>
      )}

      <p className="tool-note">
        Everything runs in your browser — your PDF is never uploaded to a
        server.
      </p>
    </div>
  );
}
