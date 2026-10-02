"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const IMG_BLOCK = (url: string) =>
  `<p style="margin:12px 0;line-height:0;"><img src="${url}" alt="" style="display:block;max-width:100%;height:auto;margin:12px 0;border:0;" /></p>`;

type Props = {
  /** When cleared to empty after send, editor resets. */
  resetKey: string;
  html: string;
  onChange: (html: string) => void;
  disabled?: boolean;
};

export function NewsletterComposer({ resetKey, html, onChange, disabled }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [uploading, setUploading] = useState(false);
  const [pasteHint, setPasteHint] = useState("");

  useEffect(() => {
    const el = editorRef.current;
    if (el && !html) el.innerHTML = "";
  }, [resetKey, html]);

  const syncFromEditor = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    onChange(el.innerHTML);
  }, [onChange]);

  async function uploadFile(file: File): Promise<string | null> {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/admin/newsletters/assets", { method: "POST", body: form });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error ?? `Upload failed (${res.status})`);
    return json.url as string;
  }

  async function insertImageUrl(url: string) {
    const el = editorRef.current;
    if (!el) return;
    el.insertAdjacentHTML("beforeend", IMG_BLOCK(url));
    syncFromEditor();
  }

  async function onPaste(e: React.ClipboardEvent<HTMLDivElement>) {
    const items = e.clipboardData?.items;
    if (!items?.length) return;

    const imageFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === "file" && item.type.startsWith("image/")) {
        const f = item.getAsFile();
        if (f) imageFiles.push(f);
      }
    }

    if (imageFiles.length === 0) {
      // Let browser paste HTML/text; sync after tick
      requestAnimationFrame(syncFromEditor);
      return;
    }

    e.preventDefault();
    setUploading(true);
    setPasteHint("");
    try {
      for (const file of imageFiles) {
        const url = await uploadFile(file);
        if (url) await insertImageUrl(url);
      }
      setPasteHint(imageFiles.length > 1 ? `${imageFiles.length} images added.` : "Image added.");
    } catch (err) {
      setPasteHint(err instanceof Error ? err.message : "Image upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    setPasteHint("");
    try {
      for (const file of Array.from(files)) {
        const url = await uploadFile(file);
        if (url) await insertImageUrl(url);
      }
    } catch (err) {
      setPasteHint(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
        <label className="cursor-pointer rounded-md border border-gray-300 px-2 py-1 hover:bg-gray-100">
          Add images
          <input type="file" accept="image/*" multiple className="hidden" disabled={disabled || uploading} onChange={onPickFiles} />
        </label>
        <span>Paste text, rich HTML, or multiple images (one block per image).</span>
        {uploading ? <span className="text-blue-600">Uploading…</span> : null}
      </div>
      <div
        ref={editorRef}
        contentEditable={!disabled}
        suppressContentEditableWarning
        onInput={syncFromEditor}
        onPaste={onPaste}
        className="min-h-[240px] w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm leading-relaxed outline-none focus:border-blue-600 [&_img]:my-3 [&_img]:block [&_img]:max-h-[480px] [&_img]:max-w-full"
        aria-label="Newsletter body"
      />
      {pasteHint ? <p className="text-xs text-gray-600">{pasteHint}</p> : null}
      <details className="text-xs text-gray-500">
        <summary className="cursor-pointer">Preview send HTML</summary>
        <pre className="mt-2 max-h-40 overflow-auto rounded border border-gray-100 bg-gray-50 p-2 whitespace-pre-wrap break-all">
          {html || "(empty)"}
        </pre>
      </details>
    </div>
  );
}
