interface AdfMark {
  type?: string;
  attrs?: Record<string, unknown>;
}

interface AdfNode {
  type?: string;
  text?: string;
  marks?: AdfMark[];
  attrs?: Record<string, unknown>;
  content?: AdfNode[];
}

function applyMarks(text: string, marks?: AdfMark[]): string {
  if (!marks?.length || !text) {
    return text;
  }

  return marks.reduce((result, mark) => {
    switch (mark.type) {
      case 'strong':
        return `**${result}**`;
      case 'em':
        return `*${result}*`;
      case 'code':
        return `\`${result}\``;
      case 'link': {
        const href = typeof mark.attrs?.href === 'string' ? mark.attrs.href : '';
        return href ? `[${result}](${href})` : result;
      }
      default:
        return result;
    }
  }, text);
}

function renderInline(node: AdfNode): string {
  if (node.type === 'text') {
    return applyMarks(node.text ?? '', node.marks);
  }
  if (node.type === 'hardBreak') {
    return '\n';
  }
  return renderChildren(node.content);
}

function renderListItem(node: AdfNode): string {
  const body = renderChildren(node.content).trim();
  return body.replace(/\n{2,}/g, '\n').replace(/\n/g, ' ').trim();
}

function renderNode(node: AdfNode): string {
  const contentText = renderChildren(node.content);

  switch (node.type) {
    case 'paragraph':
      return `${contentText.trim()}\n\n`;
    case 'heading': {
      const level = typeof node.attrs?.level === 'number' ? Math.max(1, Math.min(6, node.attrs.level)) : 3;
      return `${'#'.repeat(level)} ${contentText.trim()}\n\n`;
    }
    case 'bulletList': {
      const rows = (node.content ?? []).map((item) => `- ${renderListItem(item)}`).join('\n');
      return rows ? `${rows}\n\n` : '';
    }
    case 'orderedList': {
      const rows = (node.content ?? []).map((item, index) => `${index + 1}. ${renderListItem(item)}`).join('\n');
      return rows ? `${rows}\n\n` : '';
    }
    case 'blockquote': {
      const quote = contentText
        .trim()
        .split('\n')
        .map((line) => `> ${line}`)
        .join('\n');
      return quote ? `${quote}\n\n` : '';
    }
    case 'codeBlock':
      return `\`\`\`\n${contentText.trim()}\n\`\`\`\n\n`;
    case 'rule':
      return '\n---\n\n';
    case 'listItem':
      return `${renderListItem(node)}\n`;
    case 'text':
    case 'hardBreak':
      return renderInline(node);
    default:
      return contentText || (node.text ?? '');
  }
}

function renderChildren(content?: AdfNode[]): string {
  if (!Array.isArray(content) || content.length === 0) {
    return '';
  }
  return content.map(renderNode).join('');
}

function toMarkdownFromAdf(value: unknown): string | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const node = value as AdfNode;
  if (node.type === 'doc' || Array.isArray(node.content)) {
    const rendered = renderChildren(node.content).trim();
    return rendered || undefined;
  }

  return undefined;
}

function tryParseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export function formatIssueDescription(raw?: string): string | undefined {
  if (!raw) {
    return undefined;
  }

  let candidate: unknown = raw.trim();
  if (!candidate) {
    return undefined;
  }

  for (let i = 0; i < 2; i += 1) {
    if (typeof candidate !== 'string') {
      break;
    }
    const text = candidate.trim();
    if (!text) {
      return undefined;
    }
    const looksLikeJson = text.startsWith('{') || text.startsWith('[') || text.startsWith('"');
    if (!looksLikeJson) {
      break;
    }
    const parsed = tryParseJson(text);
    if (parsed === text) {
      break;
    }
    candidate = parsed;
  }

  if (typeof candidate === 'string') {
    return candidate.trim() || undefined;
  }

  const markdown = toMarkdownFromAdf(candidate);
  if (markdown) {
    return markdown;
  }

  return raw.trim() || undefined;
}
