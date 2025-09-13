"""Notion APIクライアント"""

from datetime import datetime
from typing import Optional

from .week_plan import WeekPlan

try:
    from notion_client import Client
except ImportError:
    Client = None


class NotionClient:
    """Notion APIクライアント"""
    
    def __init__(self, token: str, database_id: str):
        if not Client:
            raise ImportError("notion-client package is required")
        
        self.client = Client(auth=token)
        self.database_id = database_id
    
    def create_week_plan_page(self, week_plan: WeekPlan) -> str:
        """週次献立のNotionページを作成"""
        try:
            # ページタイトル
            title = f"献立 {week_plan.start_date.strftime('%Y/%m/%d')}週"
            
            # ページプロパティ
            properties = {
                "タイトル": {
                    "title": [
                        {
                            "text": {
                                "content": title
                            }
                        }
                    ]
                },
                "週開始日": {
                    "date": {
                        "start": week_plan.start_date.isoformat()
                    }
                },
                "テーマ": {
                    "rich_text": [
                        {
                            "text": {
                                "content": week_plan.theme
                            }
                        }
                    ]
                }
            }
            
            # ページコンテンツ（ブロック）
            children = self._create_page_blocks(week_plan)
            
            # ページ作成
            response = self.client.pages.create(
                parent={"database_id": self.database_id},
                properties=properties,
                children=children
            )
            
            return response["url"]
            
        except Exception as e:
            raise Exception(f"Notion API エラー: {e}")
    
    def _create_page_blocks(self, week_plan: WeekPlan) -> list:
        """ページのブロック要素を作成"""
        blocks = []
        
        # 概要
        if week_plan.notes:
            blocks.extend([
                {
                    "object": "block",
                    "type": "heading_2",
                    "heading_2": {
                        "rich_text": [{"type": "text", "text": {"content": "概要"}}]
                    }
                },
                {
                    "object": "block",
                    "type": "paragraph",
                    "paragraph": {
                        "rich_text": [{"type": "text", "text": {"content": week_plan.notes}}]
                    }
                }
            ])
        
        # 各曜日の献立
        blocks.append({
            "object": "block",
            "type": "heading_2", 
            "heading_2": {
                "rich_text": [{"type": "text", "text": {"content": "週間献立"}}]
            }
        })
        
        day_names = {
            "monday": "月曜日",
            "tuesday": "火曜日", 
            "wednesday": "水曜日",
            "thursday": "木曜日",
            "friday": "金曜日",
            "saturday": "土曜日",
            "sunday": "日曜日"
        }
        
        for day_key, day_name in day_names.items():
            if day_key in week_plan.meals:
                meal = week_plan.meals[day_key]
                blocks.extend(self._create_day_blocks(day_name, meal))
        
        return blocks
    
    def _create_day_blocks(self, day_name: str, meal: dict) -> list:
        """1日分の献立ブロックを作成"""
        blocks = [
            # 曜日見出し
            {
                "object": "block",
                "type": "heading_3",
                "heading_3": {
                    "rich_text": [{"type": "text", "text": {"content": day_name}}]
                }
            }
        ]
        
        # 献立リスト
        menu_items = []
        if "main" in meal:
            menu_items.append(f"🍖 主菜: {meal['main']}")
        if "side" in meal:
            menu_items.append(f"🥬 副菜: {meal['side']}")
        if "soup" in meal:
            menu_items.append(f"🍲 汁物: {meal['soup']}")
        
        for item in menu_items:
            blocks.append({
                "object": "block",
                "type": "bulleted_list_item",
                "bulleted_list_item": {
                    "rich_text": [{"type": "text", "text": {"content": item}}]
                }
            })
        
        # 食材
        if "ingredients" in meal and meal["ingredients"]:
            ingredients_text = "🛒 食材: " + ", ".join(meal["ingredients"])
            blocks.append({
                "object": "block",
                "type": "paragraph",
                "paragraph": {
                    "rich_text": [{"type": "text", "text": {"content": ingredients_text}}]
                }
            })
        
        # レシピURL
        if "recipe_url" in meal and meal["recipe_url"]:
            blocks.append({
                "object": "block",
                "type": "paragraph",
                "paragraph": {
                    "rich_text": [
                        {"type": "text", "text": {"content": "📋 レシピ: "}},
                        {
                            "type": "text",
                            "text": {"content": meal["recipe_url"]},
                            "href": meal["recipe_url"]
                        }
                    ]
                }
            })
        
        return blocks