/**
 * ページ上でのトースト通知機能
 * - 成功・失敗の通知をページ上に表示
 * - 自動的に消える
 * - スムーズなアニメーション効果付き
 */

import type { ToastOptions, ToastType } from "../types.ts";

const TOAST_ID = "page-to-markdown-toast";
const DEFAULT_DURATION = 3000; // 3秒
const TOAST_POSITION_TOP = "20px";
const TOAST_POSITION_RIGHT = "20px";
const TOAST_Z_INDEX = "10000";
const TOAST_PADDING = "16px 24px";
const TOAST_BORDER_RADIUS = "8px";
const TOAST_FONT_SIZE = "14px";
const TOAST_MAX_WIDTH = "300px";
const SUCCESS_COLOR = "#10b981";
const ERROR_COLOR = "#ef4444";
const WHITE_COLOR = "white";
const BOX_SHADOW = "0 4px 12px rgba(0, 0, 0, 0.15)";
const TRANSITION = "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)";
const FONT_FAMILY =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
const FONT_WEIGHT = "500";
const ANIMATION_DURATION = "0.3s";
const FADE_OUT_DELAY = 200; // フェードアウト開始前の遅延（ms）

/**
 * トーストのスタイルを生成する
 * 成功・エラーで異なる色を適用し、統一されたデザインを提供するため
 */
function createToastStyles(type: ToastType): string {
  const baseStyles = `
    position: fixed;
    top: ${TOAST_POSITION_TOP};
    right: ${TOAST_POSITION_RIGHT};
    z-index: ${TOAST_Z_INDEX};
    padding: ${TOAST_PADDING};
    border-radius: ${TOAST_BORDER_RADIUS};
    font-family: ${FONT_FAMILY};
    font-size: ${TOAST_FONT_SIZE};
    font-weight: ${FONT_WEIGHT};
    color: ${WHITE_COLOR};
    box-shadow: ${BOX_SHADOW};
    transition: ${TRANSITION};
    max-width: ${TOAST_MAX_WIDTH};
    word-wrap: break-word;
    opacity: 0;
    transform: translateX(100%) translateY(-10px);
    animation: slideIn ${ANIMATION_DURATION} cubic-bezier(0.4, 0, 0.2, 1) forwards;
  `;

  const typeStyles = type === "success"
    ? `background-color: ${SUCCESS_COLOR};`
    : `background-color: ${ERROR_COLOR};`;

  return baseStyles + typeStyles;
}

/**
 * アニメーション用のCSSキーフレームを追加する
 * スムーズなスライドアニメーションを実現し、重複追加を防ぐため
 */
function injectAnimationStyles(): void {
  const styleId = "page-to-markdown-toast-animations";

  // 既に追加済みの場合はスキップ
  if (document.getElementById(styleId)) {
    return;
  }

  const style = document.createElement("style");
  style.id = styleId;
  style.textContent = `
    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateX(100%) translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateX(0) translateY(0);
      }
    }
    
    @keyframes slideOut {
      from {
        opacity: 1;
        transform: translateX(0) translateY(0);
      }
      to {
        opacity: 0;
        transform: translateX(100%) translateY(-10px);
      }
    }
    
    .toast-fade-out {
      animation: slideOut ${ANIMATION_DURATION} cubic-bezier(0.4, 0, 0.2, 1) forwards !important;
    }
  `;

  document.head.appendChild(style);
}

/**
 * 既存のトーストを削除する
 * 複数のトーストが重複表示されることを防ぐため
 */
function removeExistingToast(): void {
  const existingToast = document.getElementById(TOAST_ID);
  if (existingToast) {
    existingToast.remove();
  }
}

/**
 * トーストをアニメーション付きで削除する
 * 突然消えるのではなく、滑らかなユーザー体験を提供するため
 */
function removeToastWithAnimation(toast: HTMLElement): Promise<void> {
  return new Promise((resolve) => {
    // フェードアウトアニメーションを適用
    toast.classList.add("toast-fade-out");

    // アニメーション完了後に要素を削除
    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
      }
      resolve();
    }, parseFloat(ANIMATION_DURATION) * 1000);
  });
}

/**
 * トースト要素を作成する
 * DOM操作を一箇所に集約し、スタイル適用を統一するため
 */
function createToastElement(options: ToastOptions): HTMLDivElement {
  const toast = document.createElement("div");
  toast.id = TOAST_ID;
  toast.style.cssText = createToastStyles(options.type);
  toast.textContent = options.message;
  return toast;
}

/**
 * トーストを表示する
 * アニメーション、重複防止、自動削除を統合した表示処理のため
 */
function showToast(options: ToastOptions): void {
  // アニメーションスタイルを注入
  injectAnimationStyles();

  // 既存のトーストを削除
  removeExistingToast();

  // 新しいトーストを作成
  const toast = createToastElement(options);
  document.body.appendChild(toast);

  // 指定時間後にアニメーション付きで削除
  setTimeout(async () => {
    const currentToast = document.getElementById(TOAST_ID);
    if (currentToast) {
      await removeToastWithAnimation(currentToast);
    }
  }, options.duration - FADE_OUT_DELAY);
}

/**
 * 成功トーストを表示する
 * 成功操作に特化したUIフィードバックを簡潔に提供するため
 */
export function showSuccessToast(
  message: string,
  duration = DEFAULT_DURATION,
): void {
  showToast({
    type: "success",
    message,
    duration,
  });
}

/**
 * エラートーストを表示する
 * エラー操作に特化したUIフィードバックを簡潔に提供するため
 */
export function showErrorToast(
  message: string,
  duration = DEFAULT_DURATION,
): void {
  showToast({
    type: "error",
    message,
    duration,
  });
}
