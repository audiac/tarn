import { Compartment } from '@codemirror/state';
import { Decoration, EditorView, ViewPlugin, WidgetType } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';

export const hideSyntaxCompartment = new Compartment();

class BulletWidget extends WidgetType {
  eq(other) {
    return other instanceof BulletWidget;
  }
  toDOM() {
    const span = document.createElement('span');
    span.className = 'cm-md-bullet';
    span.textContent = '•';
    return span;
  }
  ignoreEvent() {
    return true;
  }
}
const bulletWidget = new BulletWidget();

const HEADING_LEVEL = {
  ATXHeading1: 1,
  ATXHeading2: 2,
  ATXHeading3: 3,
  ATXHeading4: 4,
  ATXHeading5: 5,
  ATXHeading6: 6,
};

function hide(from, to, ranges) {
  if (to > from) {
    ranges.push(Decoration.replace({}).range(from, to));
  }
}

function markRange(from, to, className, ranges) {
  if (to > from) {
    ranges.push(Decoration.mark({ class: className }).range(from, to));
  }
}

function collectForNode(cursor, doc, ranges) {
  const node = cursor.node;
  const name = node.type.name;

  if (name in HEADING_LEVEL) {
    const headerMark = node.getChild('HeaderMark');
    if (headerMark) {
      let contentStart = headerMark.to;
      if (doc.sliceString(headerMark.to, headerMark.to + 1) === ' ') {
        contentStart += 1;
      }
      hide(headerMark.from, contentStart, ranges);
      markRange(contentStart, node.to, `cm-md-h${HEADING_LEVEL[name]}`, ranges);
    }
    return;
  }

  if (name === 'StrongEmphasis' || name === 'Emphasis') {
    const marks = node.getChildren('EmphasisMark');
    if (marks.length >= 2) {
      const first = marks[0];
      const last = marks[marks.length - 1];
      hide(first.from, first.to, ranges);
      hide(last.from, last.to, ranges);
      markRange(
        first.to,
        last.from,
        name === 'StrongEmphasis' ? 'cm-md-bold' : 'cm-md-italic',
        ranges,
      );
    }
    return;
  }

  if (name === 'InlineCode') {
    const marks = node.getChildren('CodeMark');
    if (marks.length >= 2) {
      const first = marks[0];
      const last = marks[marks.length - 1];
      hide(first.from, first.to, ranges);
      hide(last.from, last.to, ranges);
      markRange(first.to, last.from, 'cm-md-code', ranges);
    }
    return;
  }

  if (name === 'FencedCode') {
    const marks = node.getChildren('CodeMark');
    if (marks.length >= 1) {
      const openLine = doc.lineAt(marks[0].from);
      hide(marks[0].from, openLine.to, ranges);
    }
    if (marks.length >= 2) {
      const closeMark = marks[marks.length - 1];
      const closeLine = doc.lineAt(closeMark.from);
      hide(closeLine.from, closeMark.to, ranges);
    }
    markRange(node.from, node.to, 'cm-md-codeblock', ranges);
    return;
  }

  if (name === 'Blockquote') {
    for (const quoteMark of node.getChildren('QuoteMark')) {
      let end = quoteMark.to;
      if (doc.sliceString(quoteMark.to, quoteMark.to + 1) === ' ') {
        end += 1;
      }
      hide(quoteMark.from, end, ranges);
    }
    markRange(node.from, node.to, 'cm-md-quote', ranges);
    return;
  }

  if (name === 'ListMark') {
    const text = doc.sliceString(node.from, node.to);
    if (/^[-*+]$/.test(text)) {
      ranges.push(Decoration.replace({ widget: bulletWidget }).range(node.from, node.to));
    }
    return;
  }

  if (name === 'Link') {
    const marks = node.getChildren('LinkMark');
    if (marks.length >= 4) {
      const [open, close, parenOpen, parenClose] = marks;
      hide(open.from, open.to, ranges);
      hide(close.from, close.to, ranges);
      hide(parenOpen.from, parenClose.to, ranges);
      markRange(open.to, close.from, 'cm-md-link', ranges);
    }
    return;
  }
}

function buildDecorations(view) {
  const ranges = [];
  const doc = view.state.doc;
  for (const { from, to } of view.visibleRanges) {
    syntaxTree(view.state).iterate({
      from,
      to,
      enter: (cursor) => collectForNode(cursor, doc, ranges),
    });
  }
  return Decoration.set(ranges, true);
}

export function buildHideSyntaxExtension() {
  return ViewPlugin.fromClass(
    class {
      constructor(view) {
        this.decorations = buildDecorations(view);
      }
      update(update) {
        if (update.docChanged || update.viewportChanged) {
          this.decorations = buildDecorations(update.view);
        }
      }
    },
    {
      decorations: (plugin) => plugin.decorations,
    },
  );
}
