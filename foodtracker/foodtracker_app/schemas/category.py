from pydantic import BaseModel, ConfigDict
from typing import Optional


class CategoryBase(BaseModel):
    name: str
    icon_name: Optional[str] = None


class CategoryRead(CategoryBase):
    id: int
    model_config = ConfigDict(from_attributes=True)
