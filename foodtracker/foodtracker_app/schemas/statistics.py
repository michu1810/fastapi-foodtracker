from pydantic import BaseModel
from typing import Optional


class CategoryWasteStat(BaseModel):
    category_name: str
    icon_name: Optional[str] = None
    saved_szt: float
    wasted_szt: float
    saved_grams: float
    wasted_grams: float

    class Config:
        from_attributes = True


class MostWastedProductStat(BaseModel):
    id: int
    name: str
    wasted_value: float

    class Config:
        from_attributes = True
