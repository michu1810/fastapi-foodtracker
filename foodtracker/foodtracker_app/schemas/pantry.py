from pydantic import BaseModel, ConfigDict, EmailStr, constr
from typing import List, Optional


# Schemat do wyświetlania użytkownika w liście członków spiżarni
class PantryUser_User(BaseModel):
    id: int
    email: EmailStr
    avatar_url: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


# Schemat do wyświetlania powiązania użytkownik-spiżarnia
class PantryUser_Association(BaseModel):
    user: PantryUser_User
    role: str
    model_config = ConfigDict(from_attributes=True)


# Podstawowy schemat spiżarni z walidacją nazwy
class PantryBase(BaseModel):
    name: constr(strip_whitespace=True, min_length=2, max_length=100)


# Schemat do tworzenia spiżarni
class PantryCreate(PantryBase):
    pass


# Schemat do aktualizacji nazwy spiżarni
class PantryUpdate(PantryBase):
    pass


# Główny schemat do odczytu danych o spiżarni
class PantryRead(PantryBase):
    id: int
    owner_id: int
    member_associations: List[PantryUser_Association] = []
    model_config = ConfigDict(from_attributes=True)


# Schemat odpowiedzi z linkiem zaproszeniowym
class PantryInvitationLink(BaseModel):
    invite_link: str


# Schemat do akceptacji zaproszenia (nieużywany bezpośrednio, ale dobra praktyka)
class PantryInvitationAccept(BaseModel):
    token: str
