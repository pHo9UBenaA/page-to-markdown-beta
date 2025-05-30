/// <reference types="@types/chrome" />

/**
 * E2Eテストケース定義
 * 実際のテスト実行ロジックを担当
 * Chrome拡張機能の実際の動作を検証し、品質を保証するため
 */

import type { BrowserContext, Page } from "playwright";

const MARKDOWN_PROCESSING_WAIT_TIME = 2000; // ms
const CLIPBOARD_CONTENT_PREVIEW_LENGTH = 200;
const SERVICE_WORKER_ARRAY_FIRST_INDEX = 0;

// テスト対象サイト
export const TARGET_SITE_URL = "https://chrome-extension.pho9ubenaa.com/";

// テスト対象サイトのタイトル - 外部からアクセス不要につき内部定数化
const TARGET_SITE_TITLE = "Komiya's Chrome Extensions";

// チェック対象の文字列一覧 - 外部からアクセス不要につき内部定数化
const EXPECTED_STRINGS = [
  "Window Merger",
  "Pin Switcher",
  "Tab Cloner",
  "Reading List Register",
  "Domain Tab Organizer",
  "Tab Cleaner Extension",
];

/**
 * テスト結果の型定義
 * テスト実行結果を構造化して扱うため
 */
export type TestResult = {
  name: string;
  passed: boolean;
  error?: string;
};

/**
 * 拡張機能テスト結果のキャッシュ
 * 複数のテストで同じ拡張機能実行結果を再利用するため
 */
let cachedMarkdownContent: string | null = null;
let cacheInitialized = false;

/**
 * 拡張機能を一度だけ実行してマークダウン内容をキャッシュ
 * テスト実行コストを削減し、一貫した結果でテストするため
 */
async function initializeMarkdownCache(
  page: Page,
  context: BrowserContext,
  extensionId: string,
): Promise<{ success: boolean; error?: string }> {
  if (cacheInitialized) {
    return { success: true };
  }

  try {
    console.log(`拡張機能ID: ${extensionId}`);

    // テスト対象サイトに移動
    await page.goto(TARGET_SITE_URL);
    await page.waitForLoadState("networkidle");

    // クリップボードアクセスの許可
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    // background scriptのservice workerを取得
    const serviceWorkers = context.serviceWorkers();
    if (serviceWorkers.length === 0) {
      return {
        success: false,
        error: "拡張機能のservice workerが見つかりません",
      };
    }

    const backgroundPage = serviceWorkers[SERVICE_WORKER_ARRAY_FIRST_INDEX];

    // background scriptでアクションクリックを実行
    await backgroundPage.evaluate(async () => {
      try {
        const [tab] = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });

        if (tab?.id) {
          await chrome.tabs.sendMessage(tab.id, {
            type: "CONVERT_TO_MARKDOWN",
          });
        }
      } catch (error) {
        console.error("Background script error:", error);
      }
    });

    // マークダウン変換とクリップボードコピーの処理が完了するまで待機
    await page.waitForTimeout(MARKDOWN_PROCESSING_WAIT_TIME);

    // クリップボードの内容を取得
    const clipboardContent = await page.evaluate(async () => {
      try {
        return await navigator.clipboard.readText();
      } catch (error) {
        console.error("Clipboard read error:", error);
        return "";
      }
    });

    if (!clipboardContent) {
      return {
        success: false,
        error: "クリップボードにコンテンツがコピーされていません",
      };
    }

    cachedMarkdownContent = clipboardContent;
    cacheInitialized = true;

    console.log(
      `クリップボード内容（抜粋）: ${
        clipboardContent.substring(0, CLIPBOARD_CONTENT_PREVIEW_LENGTH)
      }...`,
    );

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * キャッシュされたマークダウン内容を取得
 * null安全性を保ちながらキャッシュデータにアクセスするため
 */
function getCachedMarkdownContent(): string {
  return cachedMarkdownContent || "";
}

/**
 * 拡張機能が正常に読み込まれているかテスト
 * Chrome拡張機能の基本的な読み込み状態を確認するため
 */
function testExtensionLoadsSuccessfully(
  _page: Page,
  context: BrowserContext,
  _extensionId: string,
): Promise<TestResult> {
  try {
    const serviceWorkers = context.serviceWorkers();

    return Promise.resolve({
      name: "拡張機能の読み込み確認",
      passed: serviceWorkers.length > 0,
      error: serviceWorkers.length === 0
        ? "拡張機能のservice workerが見つかりません"
        : undefined,
    });
  } catch (error) {
    return Promise.resolve({
      name: "拡張機能の読み込み確認",
      passed: false,
      error: `テスト実行エラー: ${
        error instanceof Error ? error.message : String(error)
      }`,
    });
  }
}

/**
 * マークダウンがクリップボードにコピーされるかテスト
 * 拡張機能の主要機能であるマークダウン変換・コピー動作を確認するため
 */
async function testMarkdownCopiedToClipboard(
  page: Page,
  context: BrowserContext,
  extensionId: string,
): Promise<TestResult> {
  try {
    const initResult = await initializeMarkdownCache(
      page,
      context,
      extensionId,
    );

    if (!initResult.success) {
      return {
        name: "マークダウンのクリップボードコピー",
        passed: false,
        error: initResult.error || "拡張機能の実行に失敗しました",
      };
    }

    const content = getCachedMarkdownContent();

    return {
      name: "マークダウンのクリップボードコピー",
      passed: content.length > 0,
      error: content.length === 0
        ? "クリップボードにコンテンツがコピーされていません"
        : undefined,
    };
  } catch (error) {
    return {
      name: "マークダウンのクリップボードコピー",
      passed: false,
      error: `テスト実行エラー: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}

/**
 * マークダウンのタイトル形式（# で始まる）をテスト
 * マークダウンのヘッダー構造が正しく生成されることを確認するため
 */
async function testMarkdownTitleFormat(
  page: Page,
  context: BrowserContext,
  extensionId: string,
): Promise<TestResult> {
  const initResult = await initializeMarkdownCache(
    page,
    context,
    extensionId,
  );

  if (!initResult.success) {
    return {
      name: "マークダウンタイトル形式チェック",
      passed: false,
      error: initResult.error || "拡張機能の実行に失敗しました",
    };
  }

  try {
    const content = getCachedMarkdownContent();
    const titleMatch = content.match(/^# .+$/m);

    if (!titleMatch) {
      return {
        name: "マークダウンタイトル形式チェック",
        passed: false,
        error: "マークダウンにタイトル（# で始まる行）が含まれていません",
      };
    }

    console.log(`抽出されたタイトル: ${titleMatch[0]}`);

    if (!titleMatch[0].includes(TARGET_SITE_TITLE)) {
      return {
        name: "マークダウンタイトル形式チェック",
        passed: false,
        error:
          `タイトルが期待する値と一致しません。期待: ${TARGET_SITE_TITLE}, 実際: ${
            titleMatch[0]
          }`,
      };
    }

    return {
      name: "マークダウンタイトル形式チェック",
      passed: true,
    };
  } catch (error) {
    return {
      name: "マークダウンタイトル形式チェック",
      passed: false,
      error: `テスト実行エラー: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}

/**
 * マークダウンのURL形式（URL: で始まる）をテスト
 * 参照元URLが正しくマークダウンに含まれることを確認するため
 */
async function testMarkdownUrlFormat(
  page: Page,
  context: BrowserContext,
  extensionId: string,
): Promise<TestResult> {
  const initResult = await initializeMarkdownCache(
    page,
    context,
    extensionId,
  );

  if (!initResult.success) {
    return {
      name: "マークダウンURL形式チェック",
      passed: false,
      error: initResult.error || "拡張機能の実行に失敗しました",
    };
  }

  try {
    const content = getCachedMarkdownContent();
    const urlMatch = content.match(/^URL: .+$/m);

    if (!urlMatch) {
      return {
        name: "マークダウンURL形式チェック",
        passed: false,
        error: "マークダウンにURL（URL: で始まる行）が含まれていません",
      };
    }

    console.log(`抽出されたURL: ${urlMatch[0]}`);

    if (!urlMatch[0].includes(TARGET_SITE_URL)) {
      return {
        name: "マークダウンURL形式チェック",
        passed: false,
        error:
          `URLが期待する値と一致しません。期待: ${TARGET_SITE_URL}, 実際: ${
            urlMatch[0]
          }`,
      };
    }

    return {
      name: "マークダウンURL形式チェック",
      passed: true,
    };
  } catch (error) {
    return {
      name: "マークダウンURL形式チェック",
      passed: false,
      error: `テスト実行エラー: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}

/**
 * マークダウンに期待する内容が含まれているかテスト
 * Webページの主要コンテンツが正しく抽出されることを確認するため
 */
async function testMarkdownContentInclusion(
  page: Page,
  context: BrowserContext,
  extensionId: string,
): Promise<TestResult> {
  const initResult = await initializeMarkdownCache(
    page,
    context,
    extensionId,
  );

  if (!initResult.success) {
    return {
      name: "マークダウン内容チェック",
      passed: false,
      error: initResult.error || "拡張機能の実行に失敗しました",
    };
  }

  try {
    const content = getCachedMarkdownContent();
    const missingStrings: string[] = [];

    for (const expectedString of EXPECTED_STRINGS) {
      if (!content.includes(expectedString)) {
        missingStrings.push(expectedString);
      }
    }

    if (missingStrings.length > 0) {
      return {
        name: "マークダウン内容チェック",
        passed: false,
        error: `マークダウンに以下の文字列が含まれていません: ${
          missingStrings.join(", ")
        }`,
      };
    }

    return {
      name: "マークダウン内容チェック",
      passed: true,
    };
  } catch (error) {
    return {
      name: "マークダウン内容チェック",
      passed: false,
      error: `テスト実行エラー: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}

/**
 * 拡張機能用のテスト配列
 * runner.tsからのみアクセスされる内部配列として定義
 */
export const EXTENSION_TESTS = [
  testExtensionLoadsSuccessfully,
  testMarkdownCopiedToClipboard,
  testMarkdownTitleFormat,
  testMarkdownUrlFormat,
  testMarkdownContentInclusion,
];
