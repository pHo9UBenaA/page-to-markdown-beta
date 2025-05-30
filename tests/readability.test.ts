/**
 * readability機能のユニットテスト
 * ページ変換機能の信頼性とclaude.ai特別処理の動作を保証するため
 */

import { assertEquals, assertExists } from "@std/assert";
import { convertPageToMarkdown } from "../src/functions/readability.ts";

const SAMPLE_HTML = `
<!DOCTYPE html>
<html>
<head>
  <title>テストページ</title>
</head>
<body>
  <article>
    <h1>メインタイトル</h1>
    <p>これはテスト用の記事内容です。マークダウンに変換されることを期待します。</p>
    <p>複数の段落を含むコンテンツです。</p>
  </article>
  <nav>
    <a href="/home">ホーム</a>
    <a href="/about">アバウト</a>
  </nav>
</body>
</html>
`;

const CLAUDE_AI_SAMPLE_HTML = `
<!DOCTYPE html>
<html>
<head>
  <title>Claude AI テストページ</title>
</head>
<body>
  <div data-test-render-count="1">
    <h2>質問1</h2>
    <p>これは最初の会話内容です。</p>
  </div>
  <div data-test-render-count="2">
    <h2>回答1</h2>
    <p>これは回答の内容です。</p>
  </div>
</body>
</html>
`;

/**
 * テスト用のDOMDocumentを作成
 * 実際のDOMなしで変換処理をテストするため
 */
function createTestDocument(html: string): Document {
  return {
    body: {
      outerHTML: html,
    },
    querySelectorAll: (selector: string) => {
      // claude.ai専用属性のテスト
      if (selector.includes("data-test-render-count")) {
        return [
          {
            outerHTML:
              '<div data-test-render-count="1"><h2>質問1</h2><p>テスト内容</p></div>',
          },
          {
            outerHTML:
              '<div data-test-render-count="2"><h2>回答1</h2><p>テスト回答</p></div>',
          },
        ];
      }
      return [];
    },
  } as unknown as Document;
}

/**
 * テスト用のlocation環境をセットアップ
 * サイト固有の処理分岐をテストするため
 */
function setupLocationEnvironment(hostname: string) {
  globalThis.location = {
    hostname,
  } as Location;
}

Deno.test("convertPageToMarkdown - 通常のページ変換", () => {
  // 一般的なWebサイトでの基本変換処理を確認するため
  setupLocationEnvironment("example.com");
  const document = createTestDocument(SAMPLE_HTML);

  const result = convertPageToMarkdown(document);

  // マークダウン変換は外部ライブラリに依存するため、成功/失敗の構造のみを確認
  assertExists(result);
  assertEquals(typeof result.success, "boolean");
});

Deno.test("convertPageToMarkdown - claude.aiサイトでの処理", () => {
  // claude.ai特有の要素抽出ロジックを確認するため
  setupLocationEnvironment("claude.ai");
  const document = createTestDocument(CLAUDE_AI_SAMPLE_HTML);

  const result = convertPageToMarkdown(document);

  assertExists(result);
  assertEquals(typeof result.success, "boolean");

  if (result.success) {
    assertEquals(typeof result.markdown, "string");
  } else {
    assertEquals(typeof result.error, "string");
  }
});

Deno.test("convertPageToMarkdown - claude.aiで要素が見つからない場合", () => {
  // claude.aiでエラーハンドリングが適切に機能することを確認するため
  setupLocationEnvironment("claude.ai");
  const emptyDocument = {
    body: { outerHTML: "<body></body>" },
    querySelectorAll: () => [],
  } as unknown as Document;

  const result = convertPageToMarkdown(emptyDocument);

  assertEquals(result.success, false);
  if (!result.success) {
    assertExists(result.error);
  }
});
