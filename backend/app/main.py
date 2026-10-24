
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import (
    Approval,
    CaseEvent,
    Evidence,
    Investigation,
    OrderCase,
    Retailer,
)

app = FastAPI(
    title="OrderAid API",
    description="Backend API for the OrderAid order resolution platform.",
    version="0.3.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def current_time():
    return datetime.now(timezone.utc).isoformat()


def case_to_dict(case: OrderCase, db: Session):
    retailer = db.get(Retailer, case.retailer_id) if case.retailer_id else None

    return {
        "case_id": case.case_number,
        "retailer": retailer.name if retailer else "Unknown retailer",
        "item": case.item or "Order item",
        "order_id": case.order_id or "",
        "issue": case.problem_description,
        "issue_type": case.issue_type,
        "requested_resolution": case.requested_resolution,
        "amount": (
            f"₹{float(case.amount):,.2f}"
            if case.amount is not None
            else "Not provided"
        ),
        "status": case.status,
        "updated_at": case.updated_at.isoformat(),
        "demo": False,
        "evidence": [
            {
                "filename": evidence.filename,
                "content_type": evidence.content_type,
            }
            for evidence in case.evidence
        ],
        "investigation": (
            {
                "status": case.investigations[-1].status,
                "message": (
                    case.investigations[-1].summary
                    or "Investigation has not started yet."
                ),
            }
            if case.investigations
            else {
                "status": "not_started",
                "message": "Case created. Investigation has not started yet.",
            }
        ),
    }


@app.get("/")
def root():
    return {
        "name": "OrderAid API",
        "message": "OrderAid backend is running.",
        "mode": "development",
    }


@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "orderaid-api"}


@app.get("/api/cases")
def get_cases():
    with SessionLocal() as db:
        cases = db.scalars(
            select(OrderCase).order_by(OrderCase.created_at.desc())
        ).all()
        return [case_to_dict(case, db) for case in cases]


@app.get("/api/cases/{case_id}")
def get_case(case_id: str):
    with SessionLocal() as db:
        case = db.scalar(
            select(OrderCase).where(OrderCase.case_number == case_id)
        )

        if not case:
            raise HTTPException(status_code=404, detail="Case not found")

        return case_to_dict(case, db)


@app.post("/api/investigate")
async def investigate_case(
    problem_description: str = Form(...),
    retailer: str = Form(...),
    order_id: str = Form(""),
    item: str = Form(""),
    amount: str = Form(""),
    issue_type: str = Form("Other"),
    requested_resolution: str = Form("Help me decide"),
    evidence: list[UploadFile] = File(default=[]),
):
    amount_value = amount.strip() or None

    if amount_value:
        try:
            parsed_amount = float(amount_value)
            if parsed_amount < 0:
                raise ValueError
        except ValueError:
            raise HTTPException(
                status_code=422,
                detail="Amount must be a valid non-negative number.",
            )

    case_number = f"OA-{uuid4().hex[:8].upper()}"

    with SessionLocal() as db:
        try:
            retailer_record = db.scalar(
                select(Retailer).where(Retailer.name == retailer.strip())
            )

            if retailer_record is None:
                retailer_record = Retailer(name=retailer.strip())
                db.add(retailer_record)
                db.flush()

            case = OrderCase(
                case_number=case_number,
                retailer_id=retailer_record.id,
                order_id=order_id.strip() or None,
                item=item.strip() or "Order item",
                problem_description=problem_description.strip(),
                issue_type=issue_type,
                requested_resolution=requested_resolution,
                amount=amount_value,
                status="Investigating",
            )

            db.add(case)
            db.flush()

            for uploaded_file in evidence:
                if uploaded_file.filename:
                    db.add(
                        Evidence(
                            case_id=case.id,
                            filename=uploaded_file.filename[:255],
                            content_type=uploaded_file.content_type,
                        )
                    )

            db.add(
                Investigation(
                    case_id=case.id,
                    status="not_started",
                    provider="tinyfish",
                    summary=(
                        "Case saved. TinyFish investigation will be connected "
                        "in the next step."
                    ),
                    findings=[],
                    source_urls=[],
                    uncertainties=[],
                )
            )

            db.add(
                CaseEvent(
                    case_id=case.id,
                    event_type="case_created",
                    message="Case created and saved to the database.",
                    details={"case_number": case_number},
                )
            )

            db.commit()
            db.refresh(case)

            return case_to_dict(case, db)

        except IntegrityError:
            db.rollback()
            raise HTTPException(
                status_code=409,
                detail=(
                    "Could not create the case because of a database conflict."
                ),
            )


class ApprovalRequest(BaseModel):
    case_id: str
    approved: bool
    otp: str | None = None


@app.post("/api/approve")
def approve_case(request: ApprovalRequest):
    with SessionLocal() as db:
        case = db.scalar(
            select(OrderCase).where(
                OrderCase.case_number == request.case_id
            )
        )

        if not case:
            raise HTTPException(status_code=404, detail="Case not found")

        if not request.approved:
            approval = Approval(
                case_id=case.id,
                approved=False,
                status="declined",
                decided_at=datetime.now(timezone.utc),
            )
            db.add(approval)

            case.status = "Approval declined"

            db.add(
                CaseEvent(
                    case_id=case.id,
                    event_type="approval_declined",
                    message="Approval declined. No external action was taken.",
                    details={"approved": False},
                )
            )

            db.commit()
            db.refresh(case)

            return {
                "message": "Approval declined. No external action was taken.",
                "case": case_to_dict(case, db),
            }

        raise HTTPException(
            status_code=409,
            detail=(
                "No verified resolution draft is available yet. "
                "No external action was taken."
            ),
        )
