/**
 * クリップボード操作機能
 * - テキストのクリップボードへのコピー
 * - 処理結果の返却
 */

const TEXTAREA_POSITION_FIXED = "fixed";
const TEXTAREA_LEFT_OFFSET = "-999999px";
const TEXTAREA_TOP_OFFSET = "-999999px";
const COPY_COMMAND = "copy";

/**
 * テキストをクリップボードにコピーする
 * 現代的なAPIと古いブラウザの互換性を両立するため
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    // 現代的なClipboard APIを使用
    if (navigator.clipboard && globalThis.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    // フォールバック：古いブラウザ向けの実装
    return copyToClipboardFallback(text);
  } catch {
    // フォールバックを試行
    return copyToClipboardFallback(text);
  }
}

/**
 * フォールバック：古いブラウザ向けのクリップボードコピー
 * Clipboard APIが利用できない環境での確実なコピー実現のため
 */
function copyToClipboardFallback(text: string): boolean {
  try {
    // テンポラリなtextareaを作成
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = TEXTAREA_POSITION_FIXED;
    textarea.style.left = TEXTAREA_LEFT_OFFSET;
    textarea.style.top = TEXTAREA_TOP_OFFSET;
    document.body.appendChild(textarea);

    // テキストを選択してコピー
    textarea.focus();
    textarea.select();
    const result = document.execCommand(COPY_COMMAND);

    // cleanup
    document.body.removeChild(textarea);

    return result;
  } catch {
    return false;
  }
}
