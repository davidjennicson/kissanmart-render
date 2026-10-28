from sqlalchemy.orm import Session
from app.models.item import Item
from app.schemas.item import ItemCreate, ItemUpdate

def get_item (db: Session,item_id : int)-> Item | None:
    return db.get(Item,item_id)


def list_items(db: Session, skip: int=0, limit: int = 100) -> list[Item]:
    return db.query(Item).offset(skip).limit(limit).all()

def create_item (db: Session, payload: ItemCreate) -> Item:
    item =Item(**payload.dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

def update_item(db: Session,item: Item, payload: ItemUpdate) -> Item:
    update_data= payload.model_dump(exclude_unset= True)
    for field, value in update_data.items():
        setattr(item,field,value)
    db.commit()
    db.refresh(item)
    return item

def delete_item(db: Session,item: Item)-> None:
    db.delete(item)
    db.commit()
