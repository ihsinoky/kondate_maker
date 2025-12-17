/**
 * Settings storage module
 *
 * このファイルは「設定データをローカルストレージへ保存／読み出しする」という
 * 単純な責務に徹しています。TypeScript に不慣れでも読み進められるよう、
 * データ構造と処理の流れを詳細にコメントしています。
 */

const STORAGE_KEY = 'kondate-maker:settings'

// 曜日を表す固定文字列の集合。
// ユニオン型で制限することで、想定外の文字列が入り込むのをコンパイル時に防ぎます。
export type DayOfWeek =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday'

// 1日分のルール。「どの曜日に／どんな方針か」をセットで保持します。
export interface DayRule {
  day: DayOfWeek
  rule: string
}

// アプリ全体の設定をまとめたオブジェクト。
// - dayRules: 曜日ごとのルール（毎週固定のメニュー方針など）
// - overallPolicy: 全体の調整方針（例: 冷蔵庫の余り物優先）
// - preferredRecipeSites: レシピ検索で優先的に参照したいサイト一覧
// - notionDatabaseId: Notion データベース ID
// - notionIntegrationToken: Notion 連携用トークン
export interface Settings {
  dayRules: DayRule[]
  overallPolicy: string
  preferredRecipeSites: string[]
  notionDatabaseId: string
  notionIntegrationToken: string
}

// アプリ初期表示時のデフォルト設定。
// ローカルストレージに何も保存されていない場合や読み込みに失敗した場合に使用します。
export const DEFAULT_SETTINGS: Settings = {
  dayRules: [
    { day: 'monday', rule: '' },
    { day: 'tuesday', rule: '' },
    { day: 'wednesday', rule: '' },
    { day: 'thursday', rule: '' },
    { day: 'friday', rule: '' },
    { day: 'saturday', rule: '' },
    { day: 'sunday', rule: '' },
  ],
  overallPolicy: '',
  preferredRecipeSites: [],
  notionDatabaseId: '',
  notionIntegrationToken: '',
}

// DEFAULT_SETTINGS は再利用目的の定数なので、そのまま返却すると
// 呼び出し側の変更が定数本体に伝搬してしまう。ここでは浅いコピーを
// 行い、常に「新しいインスタンス」を返すことで意図せぬ共有を防ぐ。
function createDefaultSettings(): Settings {
  return {
    ...DEFAULT_SETTINGS,
    dayRules: DEFAULT_SETTINGS.dayRules.map((rule) => ({ ...rule })),
    preferredRecipeSites: [...DEFAULT_SETTINGS.preferredRecipeSites],
  }
}

// ブラウザで localStorage が安全に利用できるかを確認します。
// - SSR やテスト環境では window/localStorage が未定義の場合があるため、その場で false を返します。
// - setItem/removeItem を試すことで、プライベートブラウズなどの制限も検知します。
// - 例外が発生した場合はログだけ残して処理を継続できるようにしています。
function isLocalStorageAvailable(): boolean {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false
  }

  try {
    const testKey = '__kondate_maker_test__'
    window.localStorage.setItem(testKey, testKey)
    window.localStorage.removeItem(testKey)
    return true
  } catch (error) {
    console.error('LocalStorage is not available:', error)
    return false
  }
}

// 設定をローカルストレージから読み込む。
// 1. localStorage が使えない場合は即座にデフォルトを返す。
// 2. 保存データが存在しない場合もデフォルトを返す。
// 3. 保存データがあれば JSON をパースし、デフォルトとマージして欠損値を補完する。
// 4. 途中で例外が起きた場合は安全のためデフォルトを返す。
export function loadSettings(): Settings {
  if (!isLocalStorageAvailable()) {
    return createDefaultSettings()
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return createDefaultSettings()
    }

    const parsed = JSON.parse(raw) as Partial<Settings>

    const mergedDefaults = createDefaultSettings()

    return {
      ...mergedDefaults,
      ...parsed,
      overallPolicy: parsed.overallPolicy ?? mergedDefaults.overallPolicy,
      notionDatabaseId: parsed.notionDatabaseId ?? mergedDefaults.notionDatabaseId,
      notionIntegrationToken: parsed.notionIntegrationToken ?? mergedDefaults.notionIntegrationToken,
      dayRules: parsed.dayRules ?? mergedDefaults.dayRules,
      preferredRecipeSites: parsed.preferredRecipeSites ?? mergedDefaults.preferredRecipeSites,
    }
  } catch (error) {
    console.error('Failed to load settings:', error)
    return createDefaultSettings()
  }
}

// 設定をローカルストレージへ保存する。
// 1. localStorage が使えない場合は何もせず終了。
// 2. 使える場合は JSON 文字列に変換して保存。
// 3. 書き込み時に例外が起きてもアプリの挙動を止めないようにし、ログだけ残す。
export function saveSettings(settings: Settings): void {
  if (!isLocalStorageAvailable()) {
    return
  }

  try {
    const serialized = JSON.stringify(settings)
    window.localStorage.setItem(STORAGE_KEY, serialized)
  } catch (error) {
    console.error('Failed to save settings:', error)
  }
}
