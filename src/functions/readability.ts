/**
 * @mozilla/readabilityを使用してページをマークダウンに変換する機能
 * - 現在のページのHTMLを解析
 * - 記事内容を抽出してマークダウン形式に変換
 * - claude.aiサイト専用の特別処理
 */

import { Readability } from "@mozilla/readability";
import type { ConvertResult, ReadabilityExtractResult } from "../types.ts";

const DEFAULT_ERROR_MESSAGE = "ページの変換に失敗しました";
const MINIMUM_CHAR_THRESHOLD = 100;
const CONTENT_PROPERTY_ERROR =
  "抽出されたコンテンツにcontentプロパティがありません";
const EMPTY_MARKDOWN_ERROR = "変換されたマークダウンが空です";
const EXTRACTION_ERROR = "記事内容の抽出に失敗しました";
const CLAUDE_AI_DOMAIN = "claude.ai";
const CLAUDE_AI_ATTRIBUTE = "data-test-render-count";
const SECTION_SEPARATOR = "\n\n---\n\n";
const CLAUDE_AI_NO_ELEMENTS_ERROR = "claude.aiで対象要素が見つかりませんでした";

/**
 * 現在のページがclaude.aiかどうかを判定する
 * claude.aiサイトは特殊な構造のため専用処理が必要
 */
function isClaudeAiSite(): boolean {
  return globalThis.location?.hostname.includes(CLAUDE_AI_DOMAIN) ?? false;
}

/**
 * claude.aiサイト専用：data-test-render-count属性を持つ要素を抽出する
 * claude.aiでは会話内容が特定の属性を持つ要素に格納されているため
 */
function extractClaudeAiElements(document: Document): Element[] {
  const elements = document.querySelectorAll(`[${CLAUDE_AI_ATTRIBUTE}]`);
  return Array.from(elements);
}

/**
 * 単一の要素をマークダウンに変換する
 * claude.aiの各要素を個別に処理するため
 */
function convertElementToMarkdown(element: Element): string | null {
  try {
    const extracted = extractPageContent(element.outerHTML);
    if (!extracted) {
      return null;
    }
    return convertToMarkdown(extracted);
  } catch {
    return null;
  }
}

/**
 * 要素の配列をマークダウン配列に変換する
 * 複数の要素を効率的に処理し、失敗した要素をスキップするため
 */
function convertElementsToMarkdownSections(
  elements: Element[],
): string[] {
  const markdownSections: string[] = [];

  for (const element of elements) {
    const markdown = convertElementToMarkdown(element);
    if (markdown && markdown.trim()) {
      markdownSections.push(markdown.trim());
    }
  }

  return markdownSections;
}

/**
 * マークダウンセクション配列を結合する
 * 複数のセクションを視覚的に区別可能な形で統合するため
 */
function combineMarkdownSections(sections: string[]): string {
  return sections.join(SECTION_SEPARATOR);
}

/**
 * claude.aiサイト専用の処理
 * 通常のreadability処理では会話内容を適切に抽出できないため
 */
function processClaudeAiPage(document: Document): ConvertResult {
  try {
    const elements = extractClaudeAiElements(document);

    if (elements.length === 0) {
      return {
        success: false,
        error: CLAUDE_AI_NO_ELEMENTS_ERROR,
      };
    }

    const markdownSections = convertElementsToMarkdownSections(elements);

    if (markdownSections.length === 0) {
      return {
        success: false,
        error: EMPTY_MARKDOWN_ERROR,
      };
    }

    const combinedMarkdown = combineMarkdownSections(markdownSections);

    return {
      success: true,
      markdown: combinedMarkdown,
    };
  } catch (error) {
    const errorMessage = error instanceof Error
      ? error.message
      : DEFAULT_ERROR_MESSAGE;
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * HTMLストリングから記事内容を抽出する
 * @mozilla/readabilityライブラリでの処理を分離し、エラーハンドリングを統一するため
 */
function extractPageContent(
  html: string,
): ReadabilityExtractResult {
  try {
    // @mozilla/readabilityを使用するためにDOMを作成
    const doc = new DOMParser().parseFromString(html, "text/html");
    const reader = new Readability(doc, {
      charThreshold: MINIMUM_CHAR_THRESHOLD,
    });
    return reader.parse();
  } catch {
    return null;
  }
}

/**
 * 抽出した内容をマークダウンに変換する
 * HTMLからマークダウンへの変換を行うため
 */
function convertToMarkdown(
  extractedContent: ReadabilityExtractResult,
): string {
  if (!extractedContent) {
    throw new Error(EXTRACTION_ERROR);
  }

  const content = extractedContent.content;
  if (!content || content.trim() === "") {
    throw new Error(CONTENT_PROPERTY_ERROR);
  }

  // HTMLコンテンツをマークダウンに変換するシンプルな実装
  return convertHtmlToMarkdown(content);
}

/**
 * HTMLをマークダウンに変換する
 * 基本的なHTMLタグをマークダウン記法に変換するため
 */
function convertHtmlToMarkdown(html: string): string {
  return html
    // 見出しの変換
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, "# $1\n\n")
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, "## $1\n\n")
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, "### $1\n\n")
    .replace(/<h4[^>]*>(.*?)<\/h4>/gi, "#### $1\n\n")
    .replace(/<h5[^>]*>(.*?)<\/h5>/gi, "##### $1\n\n")
    .replace(/<h6[^>]*>(.*?)<\/h6>/gi, "###### $1\n\n")
    // 段落の変換
    .replace(/<p[^>]*>(.*?)<\/p>/gi, "$1\n\n")
    // 強調の変換
    .replace(/<(strong|b)[^>]*>(.*?)<\/(strong|b)>/gi, "**$2**")
    .replace(/<(em|i)[^>]*>(.*?)<\/(em|i)>/gi, "*$2*")
    // コードの変換
    .replace(/<code[^>]*>(.*?)<\/code>/gi, "`$1`")
    .replace(/<pre[^>]*>(.*?)<\/pre>/gi, "```\n$1\n```\n\n")
    // リンクの変換
    .replace(/<a[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gi, "[$2]($1)")
    // 画像の変換
    .replace(
      /<img[^>]*src=["']([^"']*)["'][^>]*alt=["']([^"']*)["'][^>]*>/gi,
      "![$2]($1)",
    )
    .replace(
      /<img[^>]*alt=["']([^"']*)["'][^>]*src=["']([^"']*)["'][^>]*>/gi,
      "![$1]($2)",
    )
    .replace(/<img[^>]*src=["']([^"']*)["'][^>]*>/gi, "![]($1)")
    // リストの変換
    .replace(/<ul[^>]*>(.*?)<\/ul>/gis, (_match, content) => {
      return content.replace(/<li[^>]*>(.*?)<\/li>/gi, "- $1\n") + "\n";
    })
    .replace(/<ol[^>]*>(.*?)<\/ol>/gis, (_match, content) => {
      let counter = 1;
      return content.replace(
        /<li[^>]*>(.*?)<\/li>/gi,
        () => `${counter++}. $1\n`,
      ) + "\n";
    })
    // 改行の変換
    .replace(/<br[^>]*>/gi, "\n")
    // HTMLタグの除去
    .replace(/<[^>]+>/g, "")
    // HTMLエンティティのデコード
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // 余分な空白の除去
    .replace(/\n\s*\n\s*\n/g, "\n\n")
    .trim();
}

/**
 * 現在のページをマークダウンに変換する
 */
export function convertPageToMarkdown(document: Document): ConvertResult {
  // claude.aiサイトの場合は専用処理を実行
  if (isClaudeAiSite()) {
    return processClaudeAiPage(document);
  }

  try {
    // document.body.outerHTMLでページのbody要素のHTMLを取得
    const html = document.body.outerHTML;

    const extracted = extractPageContent(html);

    if (!extracted) {
      return {
        success: false,
        error: EXTRACTION_ERROR,
      };
    }

    const markdown = convertToMarkdown(extracted);

    if (!markdown.trim()) {
      return {
        success: false,
        error: EMPTY_MARKDOWN_ERROR,
      };
    }

    return {
      success: true,
      markdown,
    };
  } catch (error) {
    const errorMessage = error instanceof Error
      ? error.message
      : DEFAULT_ERROR_MESSAGE;
    return {
      success: false,
      error: errorMessage,
    };
  }
}
