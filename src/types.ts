/**
 * 拡張機能のドメインモデル定義
 * - ページからマークダウンへの変換処理
 * - クリップボード操作
 * - トースト通知
 * - claude.ai専用処理
 */

/**
 * 処理結果の成功/失敗を表す代数的データ型
 * ページ変換処理の結果を型安全に扱うため
 * - success: true の場合はmarkdownプロパティに変換結果
 * - success: false の場合はerrorプロパティにエラーメッセージ
 */
export type ConvertResult = {
  readonly success: true;
  readonly markdown: string;
} | {
  readonly success: false;
  readonly error: string;
};

/**
 * トースト通知の種類
 * UI上での通知の見た目を決定するため
 */
export type ToastType = "success" | "error";

/**
 * トースト通知の設定
 * ユーザーへの操作結果フィードバック表示に使用
 * durationはミリ秒単位で表示時間を指定
 */
export type ToastOptions = {
  readonly type: ToastType;
  readonly message: string;
  readonly duration: number; // ms
};

/**
 * content scriptとbackground script間のメッセージ
 * chrome拡張機能のプロセス間通信で使用
 * 拡張機能アイコンクリック時の処理トリガーと結果返却に利用
 */
export type ExtensionMessage = {
  readonly type: "CONVERT_TO_MARKDOWN";
} | {
  readonly type: "CONVERT_COMPLETE";
  readonly result: ConvertResult;
};

/**
 * readabilityライブラリの抽出結果の型定義
 * @mizchi/readabilityのextract関数の戻り値を表現
 * マークダウン変換処理で実際に使用される型
 */
export type ReadabilityExtractResult = {
  readonly root?: unknown;
};

/**
 * readabilityの抽出結果（詳細版）
 * 将来的な拡張で使用する可能性がある型
 * より詳細な記事情報を扱う場合の型定義
 */
export type ExtractedContent = {
  readonly title: string;
  readonly content: string;
  readonly textContent: string;
  readonly length: number;
  readonly excerpt: string;
  readonly byline: string;
  readonly dir: string;
};
