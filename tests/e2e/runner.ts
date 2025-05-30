/**
 * E2Eテスト実行ランナー
 * 分割されたモジュールを統合してテストを実行
 * Playwrightの複雑な初期化処理を隠蔽し、テスト実行を簡潔にするため
 */

import {
  setupExtensionTestEnvironment,
  teardownTestEnvironment,
} from "./setup.ts";
import { EXTENSION_TESTS, TARGET_SITE_URL, type TestResult } from "./test.ts";

const EXIT_CODE_FAILURE = 1;

/**
 * テスト結果の表示
 * 成功・失敗を視覚的に分かりやすく表示するため
 */
function displayTestResult(result: TestResult): void {
  if (result.passed) {
    console.log(`✅ ${result.name}`);
  } else {
    console.log(`❌ ${result.name}`);
    if (result.error) {
      console.log(`   エラー: ${result.error}`);
    }
  }
}

/**
 * テスト結果の集計表示
 * 全体の成功率を把握し、CI/CDでの判定に使用するため
 */
function displayTestSummary(results: TestResult[]): void {
  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;

  console.log(`\n📊 テスト結果: ${passedCount}/${totalCount} 成功`);

  if (passedCount === totalCount) {
    console.log("🎉 全てのテストが成功しました！");
  } else {
    console.log("💥 一部のテストが失敗しました");
    Deno.exit(EXIT_CODE_FAILURE);
  }
}

/**
 * 拡張機能テスト実行
 * Chrome拡張機能の動作を実際のブラウザ環境で検証するため
 */
async function runExtensionTests(): Promise<TestResult[]> {
  console.log("🧩 拡張機能テスト実行中...");

  const { browser, context, page, extensionId } =
    await setupExtensionTestEnvironment();
  const results: TestResult[] = [];

  try {
    for (const test of EXTENSION_TESTS) {
      const result = await test(page, context, extensionId);
      results.push(result);
      displayTestResult(result);
    }
  } finally {
    await teardownTestEnvironment(browser, context);
  }

  return results;
}

/**
 * メイン実行関数
 * テスト実行の全体制御とログ出力の統一のため
 */
async function runTests(): Promise<void> {
  console.log("🚀 E2Eテスト開始");
  console.log(`📍 テスト対象: ${TARGET_SITE_URL}`);

  // 拡張機能テストを実行
  const extensionResults = await runExtensionTests();

  // 結果を表示
  displayTestSummary(extensionResults);
}

// メイン実行
if (import.meta.main) {
  await runTests();
}
