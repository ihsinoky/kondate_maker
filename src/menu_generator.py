"""OpenAI APIを使った献立生成器"""

from datetime import datetime, timedelta
from typing import Optional
import json

from .week_plan import WeekPlan

try:
    import openai
except ImportError:
    openai = None


class MenuGenerator:
    """OpenAI APIを使った献立生成器"""
    
    def __init__(self, api_key: str):
        if not openai:
            raise ImportError("openai package is required")
        
        self.client = openai.OpenAI(api_key=api_key)
    
    def generate_week_plan(self) -> WeekPlan:
        """1週間分の献立を生成"""
        # 次の日曜日から始まる週の献立を作成
        today = datetime.now()
        days_ahead = 6 - today.weekday()  # 日曜日まで
        if days_ahead <= 0:
            days_ahead += 7
        start_date = today + timedelta(days=days_ahead)
        
        # OpenAI APIに送信するプロンプト
        prompt = self._create_menu_prompt()
        
        try:
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {
                        "role": "system", 
                        "content": "あなたは栄養バランスを考慮した献立作成の専門家です。日本の家庭料理を中心に、季節感のある献立を提案してください。"
                    },
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7
            )
            
            # レスポンスをパース
            content = response.choices[0].message.content
            meals_data = self._parse_openai_response(content)
            
            return WeekPlan(
                start_date=start_date,
                meals=meals_data,
                theme="AI生成献立",
                notes=f"OpenAI APIで生成（{datetime.now().strftime('%Y/%m/%d %H:%M')}）"
            )
            
        except Exception as e:
            raise Exception(f"OpenAI API エラー: {e}")
    
    def _create_menu_prompt(self) -> str:
        """献立生成用のプロンプトを作成"""
        return """
1週間分の夕食献立を作成してください。以下の条件を満たすようにお願いします：

条件:
- 月曜日〜日曜日の7日分
- 各日は主菜・副菜・汁物の構成
- 栄養バランスを考慮
- 季節感のある食材を使用
- 家庭で作りやすいメニュー
- できるだけ異なる調理方法・食材を使用

出力形式:
JSON形式で以下の構造で回答してください：

{
  "monday": {
    "main": "主菜名",
    "side": "副菜名", 
    "soup": "汁物名",
    "recipe_url": "https://cookpad.com/recipe/123456",
    "ingredients": ["食材1", "食材2", "食材3"]
  },
  "tuesday": { ... },
  ...
}

recipe_urlは実際のURLでなくても構いません（例として記載）。
ingredientsは主要な食材3-4個を記載してください。
"""
    
    def _parse_openai_response(self, content: str) -> dict:
        """OpenAIのレスポンスをパースして献立データを抽出"""
        try:
            # JSONブロックを抽出
            start = content.find('{')
            end = content.rfind('}') + 1
            json_str = content[start:end]
            
            return json.loads(json_str)
        except (json.JSONDecodeError, ValueError) as e:
            raise Exception(f"OpenAI レスポンスのパースに失敗: {e}")