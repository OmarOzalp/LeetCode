/**
 * Monaco is bundled locally (no CDN) so the editor works fully offline.
 * We load the core editor with all standard contributions (find, folding,
 * multi-cursor, comment toggling, ...) plus Python syntax highlighting.
 */
import * as monaco from "monaco-editor/esm/vs/editor/edcore.main";
import "monaco-editor/esm/vs/basic-languages/python/python.contribution";
import EditorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import { loader } from "@monaco-editor/react";

window.MonacoEnvironment = { getWorker: () => new EditorWorker() };
loader.config({ monaco });

monaco.editor.defineTheme("b75-dark", {
  base: "vs-dark",
  inherit: true,
  rules: [
    { token: "comment", foreground: "6b7280", fontStyle: "italic" },
    { token: "keyword", foreground: "c39bff" },
    { token: "string", foreground: "9ece6a" },
    { token: "number", foreground: "ff9e64" },
    { token: "type", foreground: "7dcfff" },
    { token: "identifier", foreground: "e8eaef" },
    { token: "delimiter", foreground: "9aa1ae" },
  ],
  colors: {
    "editor.background": "#0e1014",
    "editor.foreground": "#e8eaef",
    "editorLineNumber.foreground": "#3c424d",
    "editorLineNumber.activeForeground": "#9aa1ae",
    "editor.lineHighlightBackground": "#151820",
    "editor.lineHighlightBorder": "#00000000",
    "editor.selectionBackground": "#3a3f7a99",
    "editor.inactiveSelectionBackground": "#2a2e5266",
    "editorIndentGuide.background1": "#1d2129",
    "editorIndentGuide.activeBackground1": "#2f343e",
    "editorCursor.foreground": "#858cff",
    "editorWidget.background": "#161920",
    "editorWidget.border": "#2f343e",
    "editorSuggestWidget.background": "#161920",
    "editorSuggestWidget.border": "#2f343e",
    "editorSuggestWidget.selectedBackground": "#252a46",
    "scrollbarSlider.background": "#2f343e80",
    "scrollbarSlider.hoverBackground": "#3c424d",
    "editorGutter.background": "#0e1014",
    "diffEditor.insertedTextBackground": "#3ecf8e22",
    "diffEditor.removedTextBackground": "#f2676b22",
  },
});

monaco.editor.defineTheme("b75-light", {
  base: "vs",
  inherit: true,
  rules: [
    { token: "comment", foreground: "8a909d", fontStyle: "italic" },
    { token: "keyword", foreground: "7c3aed" },
    { token: "string", foreground: "15803d" },
    { token: "number", foreground: "c2410c" },
    { token: "type", foreground: "0369a1" },
  ],
  colors: {
    "editor.background": "#fbfbfc",
    "editor.lineHighlightBackground": "#f1f2f6",
    "editor.lineHighlightBorder": "#00000000",
    "editorLineNumber.foreground": "#c4c8d0",
    "editorLineNumber.activeForeground": "#59606e",
    "editorGutter.background": "#fbfbfc",
  },
});

// ------------------------------------------------------------------ Python completions
const BUILTINS = [
  "len", "range", "enumerate", "zip", "sorted", "reversed", "min", "max", "sum", "abs", "any", "all", "map", "filter",
  "list", "dict", "set", "tuple", "str", "int", "float", "bool", "ord", "chr", "divmod", "pow", "isinstance", "print",
  "float('inf')", "float('-inf')",
];
const MODULES = [
  "deque", "defaultdict", "Counter", "OrderedDict", "heapq", "heappush", "heappop", "heapify", "bisect", "bisect_left",
  "bisect_right", "lru_cache", "cache", "math", "inf", "itertools", "functools", "List", "Optional", "Dict", "Set", "Tuple",
  "ListNode", "TreeNode", "Node",
];
const METHODS = [
  "append", "pop", "popleft", "appendleft", "extend", "insert", "remove", "sort", "reverse", "index", "count", "copy",
  "get", "keys", "values", "items", "setdefault", "add", "discard", "update", "union", "intersection", "difference",
  "most_common", "split", "join", "strip", "lower", "upper", "isdigit", "isalpha", "isalnum", "startswith", "endswith",
  "replace", "find",
];

const SNIPPETS: Array<{ label: string; detail: string; body: string }> = [
  { label: "for i in range", detail: "loop over indices", body: "for ${1:i} in range(${2:len(nums)}):\n\t$0" },
  { label: "for i, x in enumerate", detail: "index + value loop", body: "for ${1:i}, ${2:x} in enumerate(${3:nums}):\n\t$0" },
  { label: "two pointers", detail: "left/right pointers", body: "left, right = 0, len(${1:nums}) - 1\nwhile left < right:\n\t$0" },
  { label: "binary search", detail: "classic template", body: "lo, hi = 0, len(${1:nums}) - 1\nwhile lo <= hi:\n\tmid = (lo + hi) // 2\n\tif ${1:nums}[mid] == ${2:target}:\n\t\treturn mid\n\tif ${1:nums}[mid] < ${2:target}:\n\t\tlo = mid + 1\n\telse:\n\t\thi = mid - 1\nreturn -1" },
  { label: "bfs", detail: "queue traversal", body: "queue = deque([${1:start}])\nvisited = {${1:start}}\nwhile queue:\n\tnode = queue.popleft()\n\t$0" },
  { label: "dfs", detail: "recursive helper", body: "def dfs(${1:node}):\n\tif not ${1:node}:\n\t\treturn\n\t$0" },
  { label: "memo dp", detail: "@lru_cache helper", body: "@lru_cache(None)\ndef dp(${1:i}):\n\tif ${2:i >= n}:\n\t\treturn ${3:0}\n\t$0" },
];

let completionsRegistered = false;
export function registerPythonCompletions() {
  if (completionsRegistered) return;
  completionsRegistered = true;
  monaco.languages.registerCompletionItemProvider("python", {
    provideCompletionItems(model, position) {
      const word = model.getWordUntilPosition(position);
      const range = new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn);
      const line = model.getLineContent(position.lineNumber).slice(0, word.startColumn - 1);
      const afterDot = line.endsWith(".");
      const K = monaco.languages.CompletionItemKind;
      const items: monaco.languages.CompletionItem[] = [];
      if (afterDot) {
        for (const m of METHODS) items.push({ label: m, kind: K.Method, insertText: m, range });
      } else {
        for (const b of BUILTINS) items.push({ label: b, kind: K.Function, insertText: b, range });
        for (const m of MODULES) items.push({ label: m, kind: K.Module, insertText: m, range });
        for (const s of SNIPPETS) {
          items.push({
            label: s.label,
            detail: s.detail,
            kind: K.Snippet,
            insertText: s.body,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range,
          });
        }
      }
      return { suggestions: items };
    },
  });
}

export { monaco };
