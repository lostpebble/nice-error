import type { INiceErrorJsonObject } from "@nice-error/core";
import type { ISerializedNiceActionResponse } from "@nice-error/nice-action";
import { demoDomain } from "demo-shared";
import { useState } from "react";
import {
  ACTION_META,
  type IActionMeta,
  type IFieldMeta,
  type TFieldType,
} from "../actions/action_field_meta";

const BACKEND_URL = import.meta.env["VITE_BACKEND_URL"] as string;
const VALIDATION_ERROR_ID = "action_input_validation_failed";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

let _uid = 0;
function nextUid() {
  return String(++_uid);
}

interface IFieldRow {
  uid: string;
  key: string;
  label: string;
  type: TFieldType;
  value: string;
}

function buildFieldRows(meta: IActionMeta): IFieldRow[] {
  return meta.fields.map((f: IFieldMeta) => ({
    uid: nextUid(),
    key: f.key,
    label: f.label,
    type: f.type,
    value: String(f.defaultValue),
  }));
}

function parseFieldValue(row: IFieldRow): string | number {
  if (row.type === "number") {
    const n = Number(row.value);
    return Number.isNaN(n) ? 0 : n;
  }
  return row.value;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ActionErrorDisplay({
  error,
  domain,
  actionId,
}: {
  error: INiceErrorJsonObject;
  domain: string;
  actionId: string;
}) {
  const isValidation = error.ids.includes(VALIDATION_ERROR_ID as never);
  return (
    <>
      <span className={`badge ${isValidation ? "badge-validation" : "badge-error"}`}>
        {isValidation ? "Validation Error" : "Action Error"}
      </span>
      <div className="result-meta">
        <span>
          domain: <code>{domain}</code>
        </span>
        <span>
          action: <code>{actionId}</code>
        </span>
        <span>
          status: <code>{error.httpStatusCode}</code>
        </span>
        <span>
          ids: <code>{error.ids.join(", ")}</code>
        </span>
      </div>
      <pre className={isValidation ? "pre-validation" : undefined}>{error.message}</pre>
    </>
  );
}

function ServerErrorDisplay({ error }: { error: INiceErrorJsonObject }) {
  return (
    <>
      <span className="badge badge-error">Server Error</span>
      <div className="result-meta">
        <span>
          status: <code>{error.httpStatusCode}</code>
        </span>
        <span>
          ids: <code>{error.ids.join(", ")}</code>
        </span>
      </div>
      <pre>{error.message}</pre>
    </>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ActionTester() {
  const [selectedActionId, setSelectedActionId] = useState<string>(ACTION_META[0].id);
  const [fields, setFields] = useState<IFieldRow[]>(() => buildFieldRows(ACTION_META[0]));
  const [result, setResult] = useState<ISerializedNiceActionResponse | null>(null);
  const [serverError, setServerError] = useState<INiceErrorJsonObject | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function clearResults() {
    setResult(null);
    setServerError(null);
    setFetchError(null);
  }

  function handleActionChange(actionId: string) {
    setSelectedActionId(actionId);
    const meta = ACTION_META.find((a) => a.id === actionId);
    if (meta != null) {
      setFields(buildFieldRows(meta));
    }
    clearResults();
  }

  function handleFieldChange(index: number, value: string) {
    setFields((prev) => prev.map((f, i) => (i === index ? { ...f, value } : f)));
  }

  function handleAddField() {
    setFields((prev) => [
      ...prev,
      {
        uid: nextUid(),
        key: `field_${prev.length}`,
        label: `Field ${prev.length}`,
        type: "string",
        value: "",
      },
    ]);
  }

  function handleRemoveField(index: number) {
    setFields((prev) => prev.filter((_, i) => i !== index));
  }

  function handleFieldKeyChange(index: number, key: string) {
    setFields((prev) => prev.map((f, i) => (i === index ? { ...f, key, label: key } : f)));
  }

  function handleFieldTypeChange(index: number, type: TFieldType) {
    setFields((prev) => prev.map((f, i) => (i === index ? { ...f, type } : f)));
  }

  async function handleExecute() {
    setLoading(true);
    clearResults();

    try {
      const input: Record<string, string | number> = {};
      for (const field of fields) {
        input[field.key] = parseFieldValue(field);
      }

      const wire = { domain: demoDomain.domain, actionId: selectedActionId, input };

      const res = await fetch(`${BACKEND_URL}resolve_action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(wire),
      });

      if (!res.ok) {
        // Non-2xx: Hono's onError returned a raw NiceError JSON (e.g. programmer error)
        setServerError((await res.json()) as INiceErrorJsonObject);
      } else {
        setResult((await res.json()) as ISerializedNiceActionResponse);
      }
    } catch (e) {
      setFetchError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  const selectedMeta = ACTION_META.find((a) => a.id === selectedActionId);
  const hasResult = result != null || serverError != null || fetchError != null;

  return (
    <div className="action-tester">
      {/* Action selector */}
      <div className="card">
        <h2>Select Action</h2>
        <div className="select-row">
          <select
            value={selectedActionId}
            onChange={(e) => handleActionChange(e.target.value)}
            className="action-select"
          >
            {ACTION_META.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        </div>
        {selectedMeta != null && <p className="action-description">{selectedMeta.description}</p>}
      </div>

      {/* Input fields */}
      <div className="card">
        <div className="fields-header">
          <h2>Input Fields</h2>
          <button className="btn-secondary" onClick={handleAddField}>
            + Add Field
          </button>
        </div>

        {fields.length === 0 && (
          <p className="empty-fields">No fields. Click "+ Add Field" to add one.</p>
        )}

        {fields.map((field, i) => (
          <div key={field.uid} className="field-row">
            <input
              className="field-key-input"
              value={field.key}
              onChange={(e) => handleFieldKeyChange(i, e.target.value)}
              placeholder="key"
            />
            <select
              className="field-type-select"
              value={field.type}
              onChange={(e) => handleFieldTypeChange(i, e.target.value as TFieldType)}
            >
              <option value="string">string</option>
              <option value="number">number</option>
            </select>
            <input
              className="field-value-input"
              type={field.type === "number" ? "number" : "text"}
              value={field.value}
              onChange={(e) => handleFieldChange(i, e.target.value)}
              placeholder="value"
            />
            <button className="btn-remove" onClick={() => handleRemoveField(i)}>
              ✕
            </button>
          </div>
        ))}

        <div className="execute-row">
          <button className="btn-primary" onClick={handleExecute} disabled={loading}>
            {loading ? "Executing..." : "Execute"}
          </button>
        </div>
      </div>

      {/* Result */}
      {hasResult && (
        <div className="card">
          <h2>Result</h2>

          {fetchError != null && (
            <div className="result-error">
              <span className="badge badge-error">Fetch Error</span>
              <pre>{fetchError}</pre>
            </div>
          )}

          {serverError != null && (
            <div className="result-error">
              <ServerErrorDisplay error={serverError} />
            </div>
          )}

          {result != null && (
            <div className={result.ok ? "result-ok" : "result-action-error"}>
              {result.ok ? (
                <>
                  <span className="badge badge-ok">OK</span>
                  <div className="result-meta">
                    <span>
                      domain: <code>{result.domain}</code>
                    </span>
                    <span>
                      action: <code>{result.id}</code>
                    </span>
                  </div>
                  <pre>{JSON.stringify(result.output, null, 2)}</pre>
                </>
              ) : (
                <ActionErrorDisplay
                  error={result.error}
                  domain={result.domain}
                  actionId={result.id}
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
