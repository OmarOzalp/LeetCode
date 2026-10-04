import { useEffect, useRef } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import { monaco, registerPythonCompletions } from "@/lib/monaco";
import { useAppStore } from "@/lib/store";
import { Spinner } from "@/components/ui/Button";

type Editor = monaco.editor.IStandaloneCodeEditor;

export interface EditorMarker {
  line: number;
  column?: number | null;
  message: string;
  severity: "error" | "warning";
}

export interface CodeEditorHandle {
  revealLine: (line: number) => void;
  focus: () => void;
}

export function CodeEditor({
  value,
  onChange,
  onRunAll,
  onRunExamples,
  onSave,
  markers,
  handleRef,
  readOnly,
}: {
  value: string;
  onChange: (v: string) => void;
  onRunAll?: () => void;
  onRunExamples?: () => void;
  onSave?: () => void;
  markers?: EditorMarker[];
  handleRef?: React.MutableRefObject<CodeEditorHandle | null>;
  readOnly?: boolean;
}) {
  const theme = useAppStore((s) => s.settings.theme);
  const fontSize = useAppStore((s) => s.settings.editorFontSize);
  const editorRef = useRef<Editor | null>(null);
  // Keep callbacks fresh for Monaco commands registered once on mount.
  const cbs = useRef({ onRunAll, onRunExamples, onSave });
  cbs.current = { onRunAll, onRunExamples, onSave };

  const onMount: OnMount = (editor) => {
    editorRef.current = editor as unknown as Editor;
    registerPythonCompletions();
    const { KeyMod, KeyCode } = monaco;
    editor.addCommand(KeyMod.CtrlCmd | KeyCode.Enter, () => cbs.current.onRunAll?.());
    editor.addCommand(KeyMod.CtrlCmd | KeyCode.Quote, () => cbs.current.onRunExamples?.());
    editor.addCommand(KeyMod.CtrlCmd | KeyCode.KeyS, () => cbs.current.onSave?.());
    if (handleRef) {
      handleRef.current = {
        revealLine: (line: number) => {
          editor.revealLineInCenter(line);
          editor.setPosition({ lineNumber: line, column: editor.getModel()?.getLineFirstNonWhitespaceColumn(line) || 1 });
          editor.focus();
        },
        focus: () => editor.focus(),
      };
    }
    if (!readOnly) editor.focus();
  };

  useEffect(() => {
    const editor = editorRef.current;
    const model = editor?.getModel();
    if (!editor || !model) return;
    monaco.editor.setModelMarkers(
      model,
      "b75",
      (markers ?? [])
        .filter((m) => m.line >= 1 && m.line <= model.getLineCount())
        .map((m) => ({
          startLineNumber: m.line,
          endLineNumber: m.line,
          startColumn: m.column && m.column > 0 ? m.column : model.getLineFirstNonWhitespaceColumn(m.line) || 1,
          endColumn: model.getLineMaxColumn(m.line),
          message: m.message,
          severity: m.severity === "error" ? monaco.MarkerSeverity.Error : monaco.MarkerSeverity.Warning,
        })),
    );
  }, [markers]);

  return (
    <Editor
      height="100%"
      language="python"
      value={value}
      theme={theme === "dark" ? "b75-dark" : "b75-light"}
      onChange={(v) => onChange(v ?? "")}
      onMount={onMount}
      loading={<Spinner className="size-5 text-muted" />}
      options={{
        fontSize,
        fontFamily: "'JetBrains Mono Variable', ui-monospace, Menlo, Consolas, monospace",
        fontLigatures: false,
        lineHeight: Math.round(fontSize * 1.6),
        tabSize: 4,
        insertSpaces: true,
        detectIndentation: false,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        renderLineHighlight: "all",
        padding: { top: 12, bottom: 12 },
        smoothScrolling: true,
        cursorBlinking: "smooth",
        bracketPairColorization: { enabled: true },
        guides: { indentation: true, bracketPairs: false },
        wordBasedSuggestions: "currentDocument",
        quickSuggestions: { other: true, comments: false, strings: false },
        suggestOnTriggerCharacters: true,
        tabCompletion: "on",
        stickyScroll: { enabled: false },
        overviewRulerBorder: false,
        scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
        readOnly,
        fixedOverflowWidgets: true,
      }}
    />
  );
}
