/// <reference types="@types/chrome" />

/**
 * Background Script for Page to Markdown Extension
 * - 拡張機能アイコンクリック時の処理
 * - アクティブなタブでのcontent scriptとの通信
 */

import type { ExtensionMessage } from "./types.ts";

const ERROR_NO_ACTIVE_TAB = "アクティブなタブが見つかりません";
const ERROR_MESSAGE_SEND = "メッセージ送信エラー:";

/**
 * アクティブなタブにメッセージを送信する
 */
async function sendMessageToActiveTab(
  message: ExtensionMessage,
): Promise<void> {
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab?.id) {
      console.error(ERROR_NO_ACTIVE_TAB);
      return;
    }

    await chrome.tabs.sendMessage(tab.id, message);
  } catch (error) {
    console.error(ERROR_MESSAGE_SEND, error);
  }
}

/**
 * 拡張機能アイコンクリック時の処理
 */
function handleExtensionClick(): void {
  sendMessageToActiveTab({ type: "CONVERT_TO_MARKDOWN" });
}

/**
 * イベントリスナーの設定
 */
function setupEventListeners(): void {
  chrome.action.onClicked.addListener(handleExtensionClick);
}

// Background scriptの初期化
setupEventListeners();
