from pydantic import BaseModel, EmailStr, Field
from datetime import date, datetime
from pydantic import field_validator, constr, ConfigDict
from typing import Optional, List, Literal


class UserCreate(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

class UserProfile(BaseModel):
    id: int
    email: EmailStr
    createdAt: Optional[datetime] = None
    avatar_url: Optional[str] = None
    provider: str
    model_config = ConfigDict(from_attributes=True)


class ProductBase(BaseModel):
    name: constr(strip_whitespace=True, min_length=2, max_length=100)
    expiration_date: date
    external_id: Optional[str] = None


class ProductCreate(BaseModel):
    name: constr(strip_whitespace=True, min_length=2, max_length=100)
    price: float = Field(gt=0)
    unit: Literal['szt.', 'g', 'kg', 'ml', 'l']
    initial_amount: float = Field(gt=0)
    is_fresh_product: Optional[bool] = False
    purchase_date: Optional[date] = None
    shelf_life_days: Optional[int] = 5
    expiration_date: Optional[date] = None
    external_id: Optional[str] = None

    @field_validator('expiration_date', 'is_fresh_product')
    def validate_dates(cls, v, values):
        # Tutaj możesz w przyszłości dodać logikę walidacji
        return v


class ProductOut(ProductBase):
    id: int
    user_id: int
    price: float
    unit: str
    initial_amount: float
    current_amount: float
    wasted_amount: float
    model_config = ConfigDict(from_attributes=True)


class ProductActionRequest(BaseModel):
    amount: float = Field(gt=0)


class ProductExpiringSoon(ProductBase):
    id: int
    days_left: int
    current_amount: float
    unit: str
    model_config = ConfigDict(from_attributes=True)


class ProductStats(BaseModel):
    total: int
    used: int
    wasted: int


class Achievement(BaseModel):
    id: str
    name: str
    description: str
    icon: str
    achieved: bool
    type: str
    current_progress: Optional[float] = None
    total_progress: Optional[float] = None


class ProductActionResponse(BaseModel):
    product: ProductOut
    unlocked_achievements: List[Achievement]


class FinancialStatsOut(BaseModel):
    saved: float
    wasted: float


class TrendData(BaseModel):
    period: str
    added: int
    used: int
    wasted: int