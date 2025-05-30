/**
 * E2Eテストのセットアップ機能
 * Playwrightブラウザとページの初期化、Chrome拡張機能のロード
 * 複雑なブラウザ設定とChrome拡張機能の読み込み処理を統一するため
 */

import {
  type Browser,
  type BrowserContext,
  chromium,
  type Page,
} from "playwright";
import { resolve } from "node:path";

const VIEWPORT_WIDTH = 1280;
const VIEWPORT_HEIGHT = 720;
const EXTENSION_ID_URL_SEGMENT_INDEX = 2;
const USER_AGENT_STRING =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36";
const CHROMIUM_CHANNEL = "chromium";
const EMPTY_STRING = "";

/**
 * 拡張機能用のテストブラウザ設定
 * Chrome拡張機能の読み込みと動作に必要な設定を提供するため
 */
function getExtensionBrowserArgs(extensionPath: string): string[] {
  return [
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--disable-web-security",
    "--disable-features=VizDisplayCompositor",
    `--disable-extensions-except=${extensionPath}`,
    `--load-extension=${extensionPath}`,
  ];
}

/**
 * 拡張機能テスト環境の初期化
 * Chrome拡張機能が実際に動作する環境を構築するため
 */
export async function setupExtensionTestEnvironment(): Promise<{
  browser: Browser;
  context: BrowserContext;
  page: Page;
  extensionId: string;
}> {
  try {
    // 拡張機能のパスを取得
    const extensionPath = resolve("./dist");
    console.log(`拡張機能パス: ${extensionPath}`);

    // chromiumチャンネルで拡張機能をロード
    const context = await chromium.launchPersistentContext(EMPTY_STRING, {
      channel: CHROMIUM_CHANNEL,
      args: getExtensionBrowserArgs(extensionPath),
      viewport: { width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT },
      userAgent: USER_AGENT_STRING,
      headless: true,
    });

    console.log("ブラウザコンテキスト作成完了");

    // Manifest v3のservice workerから拡張機能IDを取得
    let [background] = context.serviceWorkers();
    if (!background) {
      console.log("Service workerが見つからないため、イベントを待機中...");
      background = await context.waitForEvent("serviceworker");
    }

    const extensionId =
      background.url().split("/")[EXTENSION_ID_URL_SEGMENT_INDEX];
    console.log(`拡張機能ID取得完了: ${extensionId}`);

    const page = await context.newPage();
    console.log("新しいページ作成完了");

    // ブラウザオブジェクトの取得を試行
    const browser = context.browser();
    if (!browser) {
      console.error("context.browser()がnullを返しました");
      console.error(
        "これは通常、launchPersistentContextを使用した場合に発生します",
      );

      // 代替案：ダミーブラウザオブジェクトを作成
      const dummyBrowser = {
        close: () => {
          console.log("ダミーブラウザのクローズが呼ばれました");
        },
      } as Browser;

      return {
        browser: dummyBrowser,
        context,
        page,
        extensionId,
      };
    }

    return {
      browser,
      context,
      page,
      extensionId,
    };
  } catch (error) {
    console.error("セットアップ中にエラーが発生しました:", error);
    throw error;
  }
}

/**
 * テスト環境のクリーンアップ
 * メモリリークを防ぎ、テスト実行後のリソース解放を確実にするため
 */
export async function teardownTestEnvironment(
  browser: Browser | null,
  context: BrowserContext,
): Promise<void> {
  try {
    await context.close();
    console.log("コンテキストのクローズ完了");

    if (browser) {
      await browser.close();
      console.log("ブラウザのクローズ完了");
    }
  } catch (error) {
    console.error("クリーンアップ中にエラーが発生しました:", error);
  }
}
