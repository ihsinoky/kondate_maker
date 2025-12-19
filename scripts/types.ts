/**
 * 候補レシピの型定義
 * Sprint 2 P0-1で定義された最小限の構造
 */
export interface CandidateRecipe {
  /** レシピタイトル */
  title: string;
  /** レシピURL */
  url: string;
  /** ソースサイト名（例: "Nadia", "つくおき", "白ごはん.com"） */
  source: string;
  /** 調理時間テキスト（例: "30分"） - 取得できる範囲で */
  timeText?: string;
  /** タグ（例: ["スープ", "和食"]） - 取得できる範囲で */
  tags?: string[];
  /** 著者名（例: "りなてぃ"） - 取得できる範囲で */
  author?: string;
}

/**
 * 候補プール全体の型
 */
export type CandidatePool = CandidateRecipe[];
