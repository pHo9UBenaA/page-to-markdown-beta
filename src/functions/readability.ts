/**
 * @mizchi/readabilityを使用してページをマークダウンに変換する機能
 * - 現在のページのHTMLを解析
 * - 記事内容を抽出してマークダウン形式に変換
 * - claude.aiサイト専用の特別処理
 */

import { extract, toMarkdown } from "@mizchi/readability";
import type { ConvertResult, ReadabilityExtractResult } from "../types.ts";

const DEFAULT_ERROR_MESSAGE = "ページの変換に失敗しました";
const MINIMUM_CHAR_THRESHOLD = 100;
const ROOT_PROPERTY_ERROR = "抽出されたコンテンツにrootプロパティがありません";
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
 * readabilityライブラリでの処理を分離し、エラーハンドリングを統一するため
 */
function extractPageContent(
  html: string,
): ReadabilityExtractResult | null {
  try {
    return extract(html, {
      charThreshold: MINIMUM_CHAR_THRESHOLD,
    }) as ReadabilityExtractResult;
  } catch {
    return null;
  }
}

/**
 * 抽出した内容をマークダウンに変換する
 * 型安全性を保ちながらreadabilityライブラリのtoMarkdown関数を呼び出すため
 */
function convertToMarkdown(
  extractedContent: ReadabilityExtractResult,
): string {
  // @mizchi/readabilityの仕様に基づき、extractedContent.rootを渡す
  const root = extractedContent.root;
  if (!root) {
    throw new Error(ROOT_PROPERTY_ERROR);
  }
  // @mizchi/readabilityのtoMarkdown関数に必要な型アサーション
  return toMarkdown(root as Parameters<typeof toMarkdown>[0]);
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
