#!/usr/bin/env python3
"""
週次献立生成メインスクリプト

DRY_RUNモード:
- Secretsがdummy/空の場合は自動でDRY_RUN=true
- API未使用でスタブデータを生成
- JSONファイルに出力してアーティファクト保存

本番モード:
- OpenAI API で献立生成
- Notion API でページ作成
"""

import json
import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional

from src.menu_generator import MenuGenerator
from src.notion_client import NotionClient
from src.week_plan import WeekPlan


def is_placeholder(val: Optional[str]) -> bool:
    """値がプレースホルダー（dummy/空）かどうかを判定"""
    return not val or val.lower() in ("dummy", "placeholder", "")


def should_use_dry_run() -> bool:
    """DRY_RUNモードを使用すべきかどうかを判定"""
    # 環境変数からDRY_RUNを取得
    dry_run_env = os.getenv("DRY_RUN", "false").lower()
    if dry_run_env == "true":
        return True
    
    # Secretsがdummy/空の場合は自動でDRY_RUN
    openai_key = os.getenv("OPENAI_API_KEY")
    notion_token = os.getenv("NOTION_TOKEN")
    notion_db = os.getenv("NOTION_DB_ID")
    
    if any([
        is_placeholder(openai_key),
        is_placeholder(notion_token), 
        is_placeholder(notion_db)
    ]):
        return True
    
    return False


def create_stub_week_plan() -> WeekPlan:
    """DRY_RUNモード用のスタブ献立データを生成"""
    # 次の日曜日から始まる週の献立を作成
    today = datetime.now()
    days_ahead = 6 - today.weekday()  # 日曜日まで
    if days_ahead <= 0:
        days_ahead += 7
    start_date = today + timedelta(days=days_ahead)
    
    # スタブデータ
    meals = {
        "monday": {
            "main": "鶏の照り焼き",
            "side": "野菜炒め",
            "soup": "わかめスープ",
            "recipe_url": "https://cookpad.com/recipe/123456",
            "ingredients": ["鶏もも肉", "キャベツ", "にんじん", "わかめ"]
        },
        "tuesday": {
            "main": "豚の生姜焼き", 
            "side": "ひじきの煮物",
            "soup": "豆腐の味噌汁",
            "recipe_url": "https://cookpad.com/recipe/234567",
            "ingredients": ["豚ロース", "玉ねぎ", "ひじき", "豆腐"]
        },
        "wednesday": {
            "main": "鮭の塩焼き",
            "side": "きんぴらごぼう", 
            "soup": "えのきの澄まし汁",
            "recipe_url": "https://cookpad.com/recipe/345678",
            "ingredients": ["鮭", "ごぼう", "にんじん", "えのき"]
        },
        "thursday": {
            "main": "ハンバーグ",
            "side": "コールスロー",
            "soup": "コーンスープ",
            "recipe_url": "https://cookpad.com/recipe/456789",
            "ingredients": ["ひき肉", "キャベツ", "コーン", "牛乳"]
        },
        "friday": {
            "main": "麻婆豆腐",
            "side": "もやしナムル",
            "soup": "わかめスープ",
            "recipe_url": "https://cookpad.com/recipe/567890",
            "ingredients": ["豆腐", "ひき肉", "もやし", "わかめ"]
        },
        "saturday": {
            "main": "カレーライス",
            "side": "サラダ",
            "soup": "コンソメスープ",
            "recipe_url": "https://cookpad.com/recipe/678901",
            "ingredients": ["カレールー", "じゃがいも", "レタス", "トマト"]
        },
        "sunday": {
            "main": "親子丼",
            "side": "小松菜のお浸し",
            "soup": "しじみの味噌汁",
            "recipe_url": "https://cookpad.com/recipe/789012",
            "ingredients": ["鶏肉", "卵", "小松菜", "しじみ"]
        }
    }
    
    return WeekPlan(
        start_date=start_date,
        meals=meals,
        theme="バランス重視の家庭料理",
        notes="DRY_RUNモードで生成されたスタブデータです"
    )


def save_week_plan_to_json(week_plan: WeekPlan, dry_run: bool = False) -> str:
    """週次献立をJSONファイルに保存"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"weekly_menu_{timestamp}.json"
    
    data = {
        "generated_at": datetime.now().isoformat(),
        "dry_run": dry_run,
        "week_plan": week_plan.to_dict()
    }
    
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"献立データを {filename} に保存しました")
    return filename


def main():
    """メイン処理"""
    print("=== 週次献立生成ツール ===")
    
    # DRY_RUNモードの判定
    dry_run = should_use_dry_run()
    print(f"実行モード: {'DRY_RUN' if dry_run else '本番'}")
    
    if dry_run:
        print("DRY_RUNモード: スタブデータで献立を生成します")
        
        # スタブ献立を生成
        week_plan = create_stub_week_plan()
        
        # JSONファイルに保存
        json_file = save_week_plan_to_json(week_plan, dry_run=True)
        
        print(f"✅ DRY_RUN完了: {json_file} を確認してください")
        
    else:
        print("本番モード: OpenAI + Notion APIで献立を生成・投稿します")
        
        try:
            # OpenAI APIで献立生成
            generator = MenuGenerator(api_key=os.getenv("OPENAI_API_KEY"))
            week_plan = generator.generate_week_plan()
            
            # JSONファイルにバックアップ保存
            json_file = save_week_plan_to_json(week_plan, dry_run=False)
            
            # Notion APIでページ作成
            notion_client = NotionClient(
                token=os.getenv("NOTION_TOKEN"),
                database_id=os.getenv("NOTION_DB_ID")
            )
            page_url = notion_client.create_week_plan_page(week_plan)
            
            print(f"✅ 本番実行完了")
            print(f"   - JSON保存: {json_file}")
            print(f"   - Notionページ: {page_url}")
            
        except Exception as e:
            print(f"❌ エラーが発生しました: {e}")
            # エラー時もJSONファイルは保存
            week_plan = create_stub_week_plan()
            save_week_plan_to_json(week_plan, dry_run=True)
            raise


if __name__ == "__main__":
    main()