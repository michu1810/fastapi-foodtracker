from datetime import date, datetime
from typing import List, Literal, Optional
from foodtracker_app.schemas.category import CategoryRead
from pydantic import BaseModel, ConfigDict, EmailStr, Field, constr, field_validator
from decimal import Decimal


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
    send_expiration_notifications: bool
    model_config = ConfigDict(from_attributes=True)


class UserSettingsUpdate(BaseModel):
    send_expiration_notifications: bool


class ProductBase(BaseModel):
    name: constr(strip_whitespace=True, min_length=2, max_length=100)
    expiration_date: date
    external_id: Optional[str] = None


class ProductCreate(BaseModel):
    name: constr(strip_whitespace=True, min_length=2, max_length=100)
    price: float = Field(gt=0)
    unit: Literal["szt.", "g", "kg", "ml", "l"]
    initial_amount: float = Field(gt=0)
    is_fresh_product: Optional[bool] = False
    purchase_date: Optional[date] = None
    shelf_life_days: Optional[int] = 5
    expiration_date: Optional[date] = None
    external_id: Optional[str] = None

    category_id: Optional[int] = None

    @field_validator("expiration_date", "is_fresh_product")
    def validate_dates(cls, v, values):
        return v


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    expiration_date: Optional[date] = None
    price: Optional[Decimal] = Field(None, ge=0)
    unit: Optional[str] = None
    category_id: Optional[int] = None

    current_amount: Optional[Decimal] = Field(None, ge=1)
    initial_amount: Optional[Decimal] = Field(None, ge=1)

    class Config:
        from_attributes = True


class ProductOut(ProductBase):
    id: int
    pantry_id: int
    price: float
    unit: str
    initial_amount: float
    current_amount: float
    wasted_amount: float

    category: Optional[CategoryRead] = None
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
    active: int


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
