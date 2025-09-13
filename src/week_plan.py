"""週次献立プランのデータクラス"""

from datetime import datetime
from typing import Dict, List, Any


class WeekPlan:
    """週次献立プラン"""
    
    def __init__(
        self,
        start_date: datetime,
        meals: Dict[str, Dict[str, Any]],
        theme: str = "",
        notes: str = ""
    ):
        self.start_date = start_date
        self.meals = meals
        self.theme = theme
        self.notes = notes
    
    def to_dict(self) -> Dict[str, Any]:
        """辞書形式に変換"""
        return {
            "start_date": self.start_date.isoformat(),
            "theme": self.theme,
            "notes": self.notes,
            "meals": self.meals
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "WeekPlan":
        """辞書から復元"""
        return cls(
            start_date=datetime.fromisoformat(data["start_date"]),
            meals=data["meals"],
            theme=data.get("theme", ""),
            notes=data.get("notes", "")
        )