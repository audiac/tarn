import { EditorState, Compartment } from '@codemirror/state';
import { EditorView, keymap, drawSelection } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';

import { hideSyntaxCompartment, buildHideSyntaxExtension } from './hideSyntax.js';

export const hideSyntaxState = { hidden: false };

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

export function toggleSyntaxVisibility(view) {
  hideSyntaxState.hidden = !hideSyntaxState.hidden;
  view.dispatch({
    effects: hideSyntaxCompartment.reconfigure(
      hideSyntaxState.hidden ? buildHideSyntaxExtension() : [],
    ),
  });
  return hideSyntaxState.hidden;
}
