from app.database import SessionLocal
from app.tinyfish_client import search_tinyfish, run_tinyfish_agent
from datetime import datetime, timezone
from uuid import uuid4
import base64
import hashlib
import hmac
import json
import os
import time

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field
from pwdlib import PasswordHash
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import (
    Approval,
    CaseEvent,
    Evidence,
    Investigation,
    OrderCase,
    Retailer,
    User,
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


# Passwords are never stored in plain text.
password_hasher = PasswordHash.recommended()


def hash_password(password: str) -> str:
    return password_hasher.hash(password)


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        return password_hasher.verify(password, stored_hash)
    except Exception:
        return False


def _base64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def create_access_token(user_id: str, email: str) -> str:
    """Create a short-lived HMAC-signed access token using only Python's stdlib."""
    secret = os.getenv("ORDERAID_AUTH_SECRET", "").strip()
    if len(secret) < 32:
        raise HTTPException(
            status_code=500,
            detail="Server authentication secret is not configured. Set ORDERAID_AUTH_SECRET in backend/.env.",
        )

    now = int(time.time())
    header = {"alg": "HS256", "typ": "JWT"}
    payload = {
        "sub": user_id,
        "email": email,
        "iat": now,
        "exp": now + 3600,
    }
    signing_input = (
        _base64url(json.dumps(header, separators=(",", ":")).encode("utf-8"))
        + "."
        + _base64url(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    )
    signature = hmac.new(
        secret.encode("utf-8"), signing_input.encode("ascii"), hashlib.sha256
    ).digest()
    return signing_input + "." + _base64url(signature)


class SignupRequest(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=1, max_length=200)
    password: str = Field(min_length=8, max_length=128)


@app.post("/api/auth/signup", status_code=201)
def signup(payload: SignupRequest):
    email = str(payload.email).strip().lower()
    full_name = payload.full_name.strip()

    if not full_name:
        raise HTTPException(
            status_code=422,
            detail="Full name is required.",
        )

    with SessionLocal() as db:
        existing_user = db.scalar(
            select(User).where(User.email == email)
        )
        if existing_user:
            raise HTTPException(
                status_code=409,
                detail="An account with this email already exists.",
            )

        user = User(
            email=email,
            full_name=full_name,
            password_hash=hash_password(payload.password),
        )
        db.add(user)

        try:
            db.commit()
            db.refresh(user)
        except IntegrityError:
            db.rollback()
            raise HTTPException(
                status_code=409,
                detail="An account with this email already exists.",
            )

        return {
            "message": "Account created successfully.",
            "user": {
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
            },
        }


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


@app.post("/api/auth/login")
def login(payload: LoginRequest):
    email = str(payload.email).strip().lower()

    with SessionLocal() as db:
        user = db.scalar(select(User).where(User.email == email))
        if user is None or not verify_password(payload.password, user.password_hash):
            raise HTTPException(
                status_code=401,
                detail="Invalid email or password.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        token = create_access_token(user.id, user.email)
        return {
            "access_token": token,
            "token_type": "bearer",
            "expires_in": 3600,
            "user": {
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
            },
        }


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
    from urllib.parse import urlparse

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

    # Save the case before calling TinyFish.
    with SessionLocal() as db:
        try:
            retailer_name = retailer.strip()
            retailer_record = db.scalar(
                select(Retailer).where(Retailer.name == retailer_name)
            )

            if retailer_record is None:
                retailer_record = Retailer(name=retailer_name)
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

            investigation = Investigation(
                case_id=case.id,
                status="running",
                provider="tinyfish",
                summary="Searching for the retailer's official return policy.",
                findings=[],
                source_urls=[],
                uncertainties=[],
                started_at=datetime.now(timezone.utc),
            )
            db.add(investigation)

            db.add(
                CaseEvent(
                    case_id=case.id,
                    event_type="case_created",
                    message="Case created and saved to the database.",
                    details={"case_number": case_number},
                )
            )

            db.commit()
            case_id = case.id
            investigation_id = investigation.id

        except IntegrityError:
            db.rollback()
            raise HTTPException(
                status_code=409,
                detail="Could not create the case because of a database conflict.",
            )

    # Run the external research after the case has been committed.
    try:
        search_result = await search_tinyfish(
            f"{retailer_name} official return refund policy"
        )

        results = search_result.get("results", [])
        if not isinstance(results, list):
            results = []

        # Select a result whose hostname appears related to the retailer.
        retailer_token = "".join(
            char.lower() for char in retailer_name if char.isalnum()
        )
        selected_url = None

        for result in results:
            if not isinstance(result, dict):
                continue

            candidate = result.get("url", "")
            hostname = urlparse(candidate).hostname or ""
            hostname_token = "".join(
                char.lower() for char in hostname if char.isalnum()
            )

            if (
                urlparse(candidate).scheme == "https"
                and retailer_token
                and retailer_token in hostname_token
            ):
                selected_url = candidate
                break

        if not selected_url:
            raise RuntimeError(
                "Search did not return a clearly matching HTTPS retailer domain. "
                "No browser investigation was started."
            )

        agent_result = await run_tinyfish_agent(
            url=selected_url,
            goal=(
                f"Research the public return and refund policy for {retailer_name}. "
                f"The customer's issue is: {problem_description.strip()}. "
                f"The item is: {item.strip() or 'not specified'}. "
                f"The issue type is: {issue_type}. "
                "Read the policy and return a JSON object containing "
                "policy_title, key_return_conditions, refund_conditions, "
                "and source_url. Do not log in, use customer accounts, "
                "interact with forms, or initiate any transaction. "
                "Report only information supported by the page."
            ),
        )

        result_data = agent_result.get("result")

        if not isinstance(result_data, dict):
            raise RuntimeError(
                "TinyFish completed but returned no structured policy object."
            )

        # Use the actual URL visited as the source if the result's URL
        # is missing or is not an absolute HTTPS URL.
        source_url = result_data.get("source_url")
        if (
            not isinstance(source_url, str)
            or urlparse(source_url).scheme != "https"
            or not urlparse(source_url).hostname
        ):
            source_url = selected_url

        findings = [
            {
                "type": "retailer_policy",
                "policy_title": result_data.get("policy_title"),
                "key_return_conditions": result_data.get(
                    "key_return_conditions"
                ),
                "refund_conditions": result_data.get("refund_conditions"),
            }
        ]

        summary = (
            f"Policy research completed for {retailer_name}. "
            "Review the findings and source before deciding eligibility."
        )
        status = "completed"
        source_urls = [source_url]
        uncertainties = [
            "The policy alone does not confirm this order's eligibility.",
            "Product-specific terms, seller, delivery date, and order details "
            "may affect the outcome.",
        ]
        error_message = None

    except Exception as exc:
        # Preserve the case and record the failed investigation.
        status = "failed"
        summary = (
            "The case was saved, but TinyFish policy research did not complete."
        )
        findings = []
        source_urls = []
        uncertainties = ["Policy research must be retried or reviewed manually."]
        error_message = f"{type(exc).__name__}: {str(exc)[:1000]}"

    with SessionLocal() as db:
        investigation = db.get(Investigation, investigation_id)
        case = db.get(OrderCase, case_id)

        if investigation is None or case is None:
            raise HTTPException(
                status_code=500,
                detail="Case was saved, but its investigation record could not be loaded.",
            )

        investigation.status = status
        investigation.summary = summary
        investigation.findings = findings
        investigation.source_urls = source_urls
        investigation.uncertainties = uncertainties
        investigation.error_message = error_message
        investigation.completed_at = datetime.now(timezone.utc)

        if status == "completed":
            db.add(
                CaseEvent(
                    case_id=case.id,
                    event_type="investigation_completed",
                    message="TinyFish policy research completed.",
                    details={"source_urls": source_urls},
                )
            )
        else:
            db.add(
                CaseEvent(
                    case_id=case.id,
                    event_type="investigation_failed",
                    message="TinyFish policy research failed.",
                    details={"error": error_message},
                )
            )

        db.commit()
        db.refresh(case)

        return case_to_dict(case, db)


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
