
from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def new_id() -> str:
    return str(uuid4())


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=new_id
    )
    email: Mapped[str] = mapped_column(
        String(320), unique=True, index=True
    )
    full_name: Mapped[str | None] = mapped_column(String(200))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now
    )

    cases: Mapped[list["OrderCase"]] = relationship(
        back_populates="user"
    )


class Retailer(Base):
    __tablename__ = "retailers"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=new_id
    )
    name: Mapped[str] = mapped_column(
        String(200), unique=True, index=True
    )
    website_url: Mapped[str | None] = mapped_column(String(2048))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now
    )

    cases: Mapped[list["OrderCase"]] = relationship(
        back_populates="retailer"
    )


class OrderCase(Base):
    __tablename__ = "order_cases"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=new_id
    )
    case_number: Mapped[str] = mapped_column(
        String(20), unique=True, index=True
    )
    user_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id"), index=True
    )
    retailer_id: Mapped[str | None] = mapped_column(
        ForeignKey("retailers.id"), index=True
    )
    order_id: Mapped[str | None] = mapped_column(String(200))
    item: Mapped[str | None] = mapped_column(String(500))
    problem_description: Mapped[str] = mapped_column(Text)
    issue_type: Mapped[str] = mapped_column(
        String(100), default="Other"
    )
    requested_resolution: Mapped[str] = mapped_column(
        String(100), default="Help me decide"
    )
    amount: Mapped[str | None] = mapped_column(String(50))
    status: Mapped[str] = mapped_column(
        String(50), default="Investigating", index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )

    user: Mapped["User | None"] = relationship(back_populates="cases")
    retailer: Mapped["Retailer | None"] = relationship(
        back_populates="cases"
    )
    evidence: Mapped[list["Evidence"]] = relationship(
        back_populates="case", cascade="all, delete-orphan"
    )
    investigations: Mapped[list["Investigation"]] = relationship(
        back_populates="case", cascade="all, delete-orphan"
    )
    resolution_options: Mapped[list["ResolutionOption"]] = relationship(
        back_populates="case", cascade="all, delete-orphan"
    )
    approvals: Mapped[list["Approval"]] = relationship(
        back_populates="case", cascade="all, delete-orphan"
    )
    retailer_actions: Mapped[list["RetailerAction"]] = relationship(
        back_populates="case", cascade="all, delete-orphan"
    )
    events: Mapped[list["CaseEvent"]] = relationship(
        back_populates="case", cascade="all, delete-orphan"
    )


class Evidence(Base):
    __tablename__ = "evidence"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=new_id
    )
    case_id: Mapped[str] = mapped_column(
        ForeignKey("order_cases.id"), index=True
    )
    filename: Mapped[str] = mapped_column(String(255))
    content_type: Mapped[str | None] = mapped_column(String(150))
    storage_key: Mapped[str | None] = mapped_column(String(1024))
    sha256: Mapped[str | None] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now
    )

    case: Mapped["OrderCase"] = relationship(back_populates="evidence")


class Investigation(Base):
    __tablename__ = "investigations"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=new_id
    )
    case_id: Mapped[str] = mapped_column(
        ForeignKey("order_cases.id"), index=True
    )
    status: Mapped[str] = mapped_column(
        String(50), default="pending", index=True
    )
    provider: Mapped[str] = mapped_column(
        String(50), default="tinyfish"
    )
    summary: Mapped[str | None] = mapped_column(Text)
    findings: Mapped[dict | list | None] = mapped_column(JSON)
    source_urls: Mapped[list | None] = mapped_column(JSON)
    uncertainties: Mapped[list | None] = mapped_column(JSON)
    error_message: Mapped[str | None] = mapped_column(Text)
    started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True)
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True)
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now
    )

    case: Mapped["OrderCase"] = relationship(
        back_populates="investigations"
    )


class ResolutionOption(Base):
    __tablename__ = "resolution_options"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=new_id
    )
    case_id: Mapped[str] = mapped_column(
        ForeignKey("order_cases.id"), index=True
    )
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text)
    eligibility_status: Mapped[str] = mapped_column(
        String(50), default="unknown"
    )
    source_urls: Mapped[list | None] = mapped_column(JSON)
    requires_approval: Mapped[bool] = mapped_column(
        Boolean, default=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now
    )

    case: Mapped["OrderCase"] = relationship(
        back_populates="resolution_options"
    )
    approvals: Mapped[list["Approval"]] = relationship(
        back_populates="resolution_option"
    )


class Approval(Base):
    __tablename__ = "approvals"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=new_id
    )
    case_id: Mapped[str] = mapped_column(
        ForeignKey("order_cases.id"), index=True
    )
    resolution_option_id: Mapped[str | None] = mapped_column(
        ForeignKey("resolution_options.id")
    )
    action_version: Mapped[int] = mapped_column(Integer, default=1)
    approved: Mapped[bool | None] = mapped_column(Boolean)
    status: Mapped[str] = mapped_column(
        String(50), default="pending"
    )
    decided_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True)
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now
    )

    case: Mapped["OrderCase"] = relationship(back_populates="approvals")
    resolution_option: Mapped["ResolutionOption | None"] = relationship(
        back_populates="approvals"
    )


class RetailerAction(Base):
    __tablename__ = "retailer_actions"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=new_id
    )
    case_id: Mapped[str] = mapped_column(
        ForeignKey("order_cases.id"), index=True
    )
    approval_id: Mapped[str | None] = mapped_column(
        ForeignKey("approvals.id")
    )
    action_type: Mapped[str] = mapped_column(String(100))
    idempotency_key: Mapped[str] = mapped_column(
        String(200), unique=True
    )
    status: Mapped[str] = mapped_column(
        String(50), default="pending", index=True
    )
    external_reference: Mapped[str | None] = mapped_column(String(500))
    outcome_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    result_details: Mapped[dict | None] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True)
    )

    case: Mapped["OrderCase"] = relationship(
        back_populates="retailer_actions"
    )


class CaseEvent(Base):
    __tablename__ = "case_events"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=new_id
    )
    case_id: Mapped[str] = mapped_column(
        ForeignKey("order_cases.id"), index=True
    )
    event_type: Mapped[str] = mapped_column(String(100))
    message: Mapped[str] = mapped_column(Text)
    details: Mapped[dict | None] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now
    )

    case: Mapped["OrderCase"] = relationship(back_populates="events")
