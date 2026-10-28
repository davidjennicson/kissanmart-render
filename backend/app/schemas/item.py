from pydantic import BaseModel, ConfigDict,Field

class ItemBase(BaseModel):
    name: str = Field(...,min_length=1,max_length=100)
    description: str | None = Field(default=None)
    price: float = Field(...,gt=0)
    tax: float | None = Field(default=None,ge=0)
    is_active: bool | None = Field(default=True)

class ItemCreate(ItemBase):
    pass

class ItemUpdate(ItemBase):
    name: str | None = None
    description: str | None = None
    price: float | None = None
    tax: float | None = None
    is_active: bool | None = None
    
class ItemRead(ItemBase):
    id: int
    model_config= ConfigDict(from_attributes=True)