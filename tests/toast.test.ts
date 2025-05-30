/**
 * toast機能のユニットテスト
 * UI通知機能の動作とトースト重複防止を確認するため
 */

import { assertEquals, assertExists } from "@std/assert";
import { showErrorToast, showSuccessToast } from "../src/functions/toast.ts";

/**
 * テスト用のDOM環境をセットアップ
 * ブラウザ環境をシミュレートしてトースト表示をテストするため
 */
function setupDOMEnvironment() {
  // MockDocumentを作成
  const mockElements = new Map<string, Element>();

  globalThis.document = {
    getElementById: (id: string) => mockElements.get(id) || null,
    createElement: (_tagName: string) => {
      const element = {
        id: "",
        style: {},
        textContent: "",
        classList: {
          add: () => {},
          remove: () => {},
        },
        remove: () => {
          if (element.id) {
            mockElements.delete(element.id);
          }
        },
      };
      return element as unknown as HTMLElement;
    },
    head: {
      appendChild: (_element: Element) => {
        // headに追加されるstyle要素の処理
      },
    },
    body: {
      appendChild: (element: Element) => {
        if ((element as unknown as { id: string }).id) {
          mockElements.set((element as unknown as { id: string }).id, element);
        }
      },
    },
  } as unknown as Document;

  // setTimeout のモック
  globalThis.setTimeout = ((_callback: () => void, _delay: number) => {
    // テストでは即座に実行しない（無限ループを避けるため）
    return 1;
  }) as typeof setTimeout;
}

Deno.test("showSuccessToast - 成功メッセージを表示", () => {
  // 成功操作の適切なフィードバック表示を確認するため
  setupDOMEnvironment();

  showSuccessToast("テスト成功メッセージ");

  const toastElement = document.getElementById("page-to-markdown-toast");
  assertExists(toastElement);
  assertEquals(toastElement.textContent, "テスト成功メッセージ");
});

Deno.test("showErrorToast - エラーメッセージを表示", () => {
  // エラー操作の適切なフィードバック表示を確認するため
  setupDOMEnvironment();

  showErrorToast("テストエラーメッセージ");

  const toastElement = document.getElementById("page-to-markdown-toast");
  assertExists(toastElement);
  assertEquals(toastElement.textContent, "テストエラーメッセージ");
});

Deno.test("showSuccessToast - 複数回呼び出し時は前のトーストを削除", () => {
  // 重複表示を防ぐ機能が正しく動作することを確認するため
  setupDOMEnvironment();

  showSuccessToast("最初のメッセージ");
  showSuccessToast("2番目のメッセージ");

  const toastElement = document.getElementById("page-to-markdown-toast");
  assertExists(toastElement);
  assertEquals(toastElement.textContent, "2番目のメッセージ");
});
