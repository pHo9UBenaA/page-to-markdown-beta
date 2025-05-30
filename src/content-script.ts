/// <reference types="@types/chrome" />

/**
 * Content Script for Page to Markdown Extension
 * - ページのマークダウン変換処理
 * - クリップボードへのコピー（タイトル・URL含む）
 * - トースト通知の表示
 */

import { convertPageToMarkdown } from "./functions/readability.ts";
import { copyToClipboard } from "./functions/clipboard.ts";
import { showErrorToast, showSuccessToast } from "./functions/toast.ts";
import type { ExtensionMessage } from "./types.ts";

const ERROR_CONVERT_PREFIX = "変換エラー:";
const ERROR_CLIPBOARD_COPY = "クリップボードへのコピーに失敗しました";
const ERROR_UNEXPECTED = "予期しないエラーが発生しました";
const ERROR_PREFIX = "エラー:";
const SUCCESS_COPY_MESSAGE = "マークダウンをクリップボードにコピーしました";
const MARKDOWN_SEPARATOR = "\n\n---\n\n";

/**
 * ページのタイトルとURLをマークダウン形式のヘッダーとして生成
 */
function createMarkdownHeader(): string {
  const title = document.title || "無題";
  const url = globalThis.location?.href || "";

  return `# ${title}\n\nURL: ${url}`;
}

/**
 * メイン処理：ページをマークダウンに変換してクリップボードにコピー
 */
async function handleConvertToMarkdown(): Promise<void> {
  try {
    // ページをマークダウンに変換
    const result = convertPageToMarkdown(document);

    if (!result.success) {
      showErrorToast(`${ERROR_CONVERT_PREFIX} ${result.error}`);
      return;
    }

    // タイトルとURLのヘッダーを作成
    const header = createMarkdownHeader();

    // ヘッダーとマークダウン内容を結合
    const finalMarkdown = `${header}${MARKDOWN_SEPARATOR}${result.markdown}`;

    // クリップボードにコピー
    const copySuccess = await copyToClipboard(finalMarkdown);

    if (!copySuccess) {
      showErrorToast(ERROR_CLIPBOARD_COPY);
      return;
    }

    // 成功を通知
    showSuccessToast(SUCCESS_COPY_MESSAGE);
  } catch (error) {
    const errorMessage = error instanceof Error
      ? error.message
      : ERROR_UNEXPECTED;
    showErrorToast(`${ERROR_PREFIX} ${errorMessage}`);
  }
}

/**
 * メッセージリスナーの設定
 */
function setupMessageListener(): void {
  chrome.runtime.onMessage.addListener((message: ExtensionMessage) => {
    if (message.type === "CONVERT_TO_MARKDOWN") {
      handleConvertToMarkdown();
    }
  });
}

// Content scriptの初期化
setupMessageListener();
