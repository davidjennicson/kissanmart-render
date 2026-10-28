from fastapi import APIRouter,HTTPException,status
from app.api.deps import SessionDep
from app.schemas.item import ItemCreate,ItemRead,ItemUpdate
from app.services import item as item_service


router= APIRouter(prefix="/item", tags=["items"])

@router.get("",response_model=list[ItemRead])
def read_items(db: SessionDep,skip: int=0, limit: int=100):
    return item_service.list_items(db,skip=skip,limit=limit)