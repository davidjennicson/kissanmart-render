from sqlalchemy import Integer, String ,Float, Boolean, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.db import Base

class Item(Base):
    __tablename__ = "items"
    id: Mapped[int]=mapped_column(Integer,primary_key=True)
    name: Mapped[str]=mapped_column(String(255),nullable=False)
    price: Mapped[float]=mapped_column(Float,nullable=False)
    tax: Mapped[float| None]=mapped_column(Float,nullable=True)
    description: Mapped[str| None]=mapped_column(Text,nullable=True)