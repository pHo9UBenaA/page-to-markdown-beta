/**
 * clipboard機能のユニットテスト
 * クリップボード操作の信頼性を保証するため
 */

import { assertEquals } from "@std/assert";
import { copyToClipboard } from "../src/functions/clipboard.ts";

/**
 * テスト用のモックnavigator.clipboardを作成
 * 実際のクリップボードAPIを使わずに制御された環境でテストするため
 */
function createMockClipboard(shouldFail = false) {
  return {
    writeText: (_text: string) => {
      if (shouldFail) {
        return Promise.reject(new Error("Mock clipboard error"));
      }
      return Promise.resolve();
    },
  };
}

/**
 * テスト用のDOM環境をセットアップ
 * Denoテスト環境にはDOMがないため、必要な要素をモックするため
 */
function setupDOMEnvironment() {
  // グローバルオブジェクトにDOMメソッドを追加
  globalThis.document = {
    createElement: (_tagName: string) => ({
      value: "",
      style: {},
      focus: () => {},
      select: () => {},
    }),
    body: {
      appendChild: () => {},
      removeChild: () => {},
    },
    execCommand: () => true,
  } as unknown as Document;

  globalThis.isSecureContext = true;
}

Deno.test("copyToClipboard - 成功時にtrueを返す", async () => {
  // 正常なケースでの動作確認のため
  setupDOMEnvironment();
  const mockClipboard = createMockClipboard(false);
  globalThis.navigator = { clipboard: mockClipboard } as unknown as Navigator;

  const result = await copyToClipboard("test text");
  assertEquals(result, true);
});

Deno.test("copyToClipboard - Clipboard API失敗時にフォールバックを使用", async () => {
  // APIが失敗した場合の堅牢性を確認するため
  setupDOMEnvironment();
  const mockClipboard = createMockClipboard(true);
  globalThis.navigator = { clipboard: mockClipboard } as unknown as Navigator;

  const result = await copyToClipboard("test text");
  assertEquals(result, true);
});

Deno.test("copyToClipboard - Clipboard APIが利用できない環境でフォールバックを使用", async () => {
  // 古いブラウザでの互換性を確認するため
  setupDOMEnvironment();
  globalThis.navigator = {} as Navigator;
  globalThis.isSecureContext = false;

  const result = await copyToClipboard("test text");
  assertEquals(result, true);
});

Deno.test("copyToClipboard - タイトルとURL付きマークダウンテキストをコピー", async () => {
  // 実際の使用ケースでのマークダウン形式データの処理を確認するため
  setupDOMEnvironment();
  const mockClipboard = createMockClipboard(false);
  globalThis.navigator = { clipboard: mockClipboard } as unknown as Navigator;

  const markdownWithHeader = `# テストページ

**URL:** https://example.com

---

## 記事タイトル

記事の内容`;

  const result = await copyToClipboard(markdownWithHeader);
  assertEquals(result, true);
});
