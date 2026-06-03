"""Family member linking by registered email."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session
from database import get_db
from models import User, FamilyLink
from routers.auth import get_current_user, _user_to_dict

router = APIRouter(prefix="/api/family", tags=["Family"])


ALLOWED_FAMILY_RELATIONS = frozenset({"spouse", "parent", "child", "sibling"})


class LinkFamilyRequest(BaseModel):
    email: str
    relation: str

    @field_validator("email")
    @classmethod
    def email_must_contain_at(cls, v: str) -> str:
        v = v.strip()
        if "@" not in v or len(v) < 5:
            raise ValueError("Enter a valid email address")
        return v

    @field_validator("relation")
    @classmethod
    def relation_must_be_specific(cls, v: str) -> str:
        rel = (v or "").strip().lower()
        if rel not in ALLOWED_FAMILY_RELATIONS:
            raise ValueError("Choose Spouse, Parent, Child, or Sibling")
        return rel


def _member_summary(user: User, relation: str) -> dict:
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "phone": user.phone,
        "age": user.age,
        "gender": user.gender,
        "blood_group": user.blood_group,
        "village": user.village,
        "relation": relation,
        "medical_conditions": _user_to_dict(user).get("medical_conditions", []),
    }


@router.get("/members")
def list_family_members(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List users linked to the current account."""
    links = db.query(FamilyLink).filter(FamilyLink.user_id == user.id).all()
    members = []
    for link in links:
        other = db.query(User).filter(User.id == link.linked_user_id).first()
        if other:
            members.append(_member_summary(other, link.relation or "family"))
    return {"members": members, "count": len(members)}


@router.post("/link")
def link_family_by_email(
    body: LinkFamilyRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Link another HealthMitra user as family using their signup email."""
    target_email = body.email.strip().lower()
    if target_email == user.email.strip().lower():
        raise HTTPException(status_code=400, detail="You cannot link your own email")

    other = db.query(User).filter(User.email == body.email.strip()).first()
    if not other:
        other = db.query(User).filter(User.email.ilike(body.email.strip())).first()
    if not other:
        raise HTTPException(status_code=404, detail="No account found with that email")

    if other.role not in ("user",):
        raise HTTPException(status_code=400, detail="That account cannot be linked as a family member")

    existing = db.query(FamilyLink).filter(
        FamilyLink.user_id == user.id,
        FamilyLink.linked_user_id == other.id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already linked to this family member")

    relation = body.relation.strip().lower()
    db.add(FamilyLink(user_id=user.id, linked_user_id=other.id, relation=relation))
    reverse = db.query(FamilyLink).filter(
        FamilyLink.user_id == other.id,
        FamilyLink.linked_user_id == user.id,
    ).first()
    if not reverse:
        db.add(FamilyLink(user_id=other.id, linked_user_id=user.id, relation=relation))
    db.commit()

    return {
        "message": f"Linked with {other.name}",
        "member": _member_summary(other, relation),
    }


@router.delete("/link/{linked_user_id}")
def unlink_family_member(
    linked_user_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove a family link (both directions)."""
    link = db.query(FamilyLink).filter(
        FamilyLink.user_id == user.id,
        FamilyLink.linked_user_id == linked_user_id,
    ).first()
    if not link:
        raise HTTPException(status_code=404, detail="Family link not found")

    db.delete(link)
    reverse = db.query(FamilyLink).filter(
        FamilyLink.user_id == linked_user_id,
        FamilyLink.linked_user_id == user.id,
    ).first()
    if reverse:
        db.delete(reverse)
    db.commit()
    return {"message": "Family member unlinked"}
