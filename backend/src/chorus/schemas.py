from __future__ import annotations
from datetime import datetime
from typing import Literal
from pydantic import BaseModel, Field

class RunRequest(BaseModel):
    question: str = Field(min_length=3, max_length=2000)
    
class AnglePlan(BaseModel):
    angle_id: str
    brief: str
    search_seeds: list[str]
    
class Citation(BaseModel):
    url: str
    title: str
    snippet: str
    retrieved_at: datetime
    
class Finding(BaseModel):
    claim: str
    support: str
    citations: list[Citation]
    confidence: Literal["low", "medium", "high"]
    
class ResearcherOutput(BaseModel):
    angle_id: str
    findings: list[Finding]
    open_questions: list[str]
    
class ContradictionRef(BaseModel):
    claim_a: str
    claim_b: str
    explanation: str

class ClaimRef(BaseModel):
    claim: str
    reason: str

class FollowupRequest(BaseModel):
    angle_id: str
    instruction: str

class Critique(BaseModel):
    contradictions: list[ContradictionRef]
    weak_claims: list[ClaimRef]
    gaps: list[str]
    needs_followup: list[FollowupRequest]
    
class ContestedPoint(BaseModel):
    topic:str
    positions: list[str]
    sources: list[Citation]

class Report(BaseModel):
    question: str
    tl_dr: str
    key_findings: list[Finding]
    contested_points: list[ContestedPoint]
    sources: list[Citation]
    confidence_overall: Literal["low", "medium", "high"]
    generated_at: datetime

