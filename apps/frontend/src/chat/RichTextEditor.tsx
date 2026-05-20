import React, { useCallback, useEffect, useRef } from 'react';

interface RichTextEditorProps {
  id: string;
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

function isEmptyHtml(html: string): boolean {
  const stripped = html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
  return stripped.length === 0;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  id,
  value,
  onChange,
  placeholder = 'Write something…',
}) => {
  const editorRef = useRef<HTMLDivElement>(null);

  const syncFromDom = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    const html = el.innerHTML;
    onChange(isEmptyHtml(html) ? '' : html);
  }, [onChange]);

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    const next = value || '';
    if (el.innerHTML !== next) {
      el.innerHTML = next;
    }
  }, [value]);

  function exec(command: string, valueArg?: string) {
    document.execCommand(command, false, valueArg);
    editorRef.current?.focus();
    syncFromDom();
  }

  return (
    <div className="rich-editor">
      <div className="rich-editor__toolbar" role="toolbar" aria-label="Formatting">
        <button type="button" className="rich-editor__tool" title="Bold" onClick={() => exec('bold')}>
          <strong>B</strong>
        </button>
        <button type="button" className="rich-editor__tool" title="Italic" onClick={() => exec('italic')}>
          <em>I</em>
        </button>
        <button type="button" className="rich-editor__tool" title="Underline" onClick={() => exec('underline')}>
          <span className="rich-editor__underline">U</span>
        </button>
        <button
          type="button"
          className="rich-editor__tool"
          title="Bullet list"
          onClick={() => exec('insertUnorderedList')}
        >
          •≡
        </button>
      </div>
      <div
        ref={editorRef}
        id={id}
        className="rich-editor__area"
        contentEditable
        role="textbox"
        aria-multiline="true"
        data-placeholder={placeholder}
        onInput={syncFromDom}
        onBlur={syncFromDom}
        suppressContentEditableWarning
      />
    </div>
  );
};
