import { EditorState, Compartment } from '@codemirror/state';
import { EditorView, keymap, drawSelection } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';

import { hideSyntaxCompartment, buildHideSyntaxExtension } from './hideSyntax.js';

export function createEditorView({ doc, parent, onDocChanged }) {
  const state = EditorState.create({
    doc,
    extensions: [
      history(),
      drawSelection(),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      markdown(),
      syntaxHighlighting(defaultHighlightStyle),
      EditorView.lineWrapping,
      hideSyntaxCompartment.of([]),
      EditorView.updateListener.of((update) => {
        if (update.docChanged && onDocChanged) {
          onDocChanged();
        }
      }),
    ],
  });

  return new EditorView({ state, parent });
}

// Syntax visibility is tracked per tab in the renderer, so this just applies
// the requested state to a given view rather than owning a shared flag.
export function applySyntaxHidden(view, hidden) {
  view.dispatch({
    effects: hideSyntaxCompartment.reconfigure(
      hidden ? buildHideSyntaxExtension() : [],
    ),
  });
}
