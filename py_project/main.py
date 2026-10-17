"""
TenderBridge AI Engine - FastAPI Microservice
Provides predictive analytics, delay prediction, budget overrun estimation,
smart bid evaluation, document extraction, and contractor health scoring.
"""

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

from engines.risk_engine import ProjectRiskEngine
from engines.bid_evaluator import SmartBidEvaluator
from engines.document_analyzer import TenderDocumentAnalyzer
from engines.contractor_scorer import ContractorScorer

app = FastAPI(
    title="TenderBridge AI & Analytics Engine",
    description="Intelligent Decision-Support Microservice for Government e-Tenders & Construction Management",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Enable CORS for frontend and backend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------- Request Models -----------------

class DelayRiskRequest(BaseModel):
    planned_duration_days: int = Field(..., gt=0, description="Total planned duration of the project in days")
    days_elapsed: int = Field(..., ge=0, description="Days passed since project start")
    progress_percentage: float = Field(..., ge=0, le=100, description="Current recorded physical completion %")
    weather_severity_index: Optional[float] = Field(0.2, ge=0.0, le=1.0, description="0 (clear) to 1.0 (extreme monsoons/cyclone)")
    defect_count: Optional[int] = Field(0, ge=0, description="Total open quality/safety inspection defects")
    contractor_historical_delay_rate: Optional[float] = Field(0.1, ge=0.0, le=1.0, description="Contractor past delay ratio")

class BudgetOverrunRequest(BaseModel):
    budget: float = Field(..., gt=0, description="Approved project contract budget in INR")
    actual_cost: float = Field(..., ge=0, description="Actual funds disbursed so far")
    progress_percentage: float = Field(..., gt=0, le=100, description="Current recorded progress %")
    material_inflation_index: Optional[float] = Field(0.05, ge=0.0, le=0.50, description="Estimated price escalation rate")

class BidItem(BaseModel):
    bid_id: str
    contractor_name: str
    proposed_amount: float
    technical_score: Optional[float] = 75.0
    completed_projects: Optional[int] = 3
    contractor_rating: Optional[float] = 4.0
    has_valid_gst: Optional[bool] = True
    has_valid_pan: Optional[bool] = True

class BidEvaluationRequest(BaseModel):
    estimated_budget: float = Field(..., gt=0, description="Government benchmark estimated budget in INR")
    bids: List[BidItem] = Field(..., min_items=1, description="List of contractor bids to analyze and rank")

class DocumentAnalysisRequest(BaseModel):
    document_text: str = Field(..., min_length=10, description="Raw text of tender notice, NIT, or BOQ specification")

class ContractorScoreRequest(BaseModel):
    verification_status: Optional[str] = "verified"
    years_of_experience: Optional[int] = 5
    rating: Optional[float] = 4.2
    completed_projects: Optional[int] = 6
    has_gst: Optional[bool] = True
    has_pan: Optional[bool] = True
    inspection_pass_rate: Optional[float] = 0.95

# ----------------- API Endpoints -----------------

@app.get("/")
def root():
    return {
        "service": "TenderBridge AI & Analytics Engine",
        "status": "online",
        "version": "1.0.0",
        "docs": "/docs",
        "capabilities": [
            "Project Delay Risk Prediction",
            "Budget Overrun Forecasting",
            "Smart Multi-Criteria Bid Evaluation",
            "Tender Document & Specification Extraction",
            "Contractor Health & Trust Scoring"
        ]
    }

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "py_project_ai_engine"}

@app.post("/api/predict/delay-risk")
def predict_delay(req: DelayRiskRequest):
    try:
        result = ProjectRiskEngine.predict_delay_risk(
            planned_duration_days=req.planned_duration_days,
            days_elapsed=req.days_elapsed,
            progress_percentage=req.progress_percentage,
            weather_severity_index=req.weather_severity_index,
            defect_count=req.defect_count,
            contractor_historical_delay_rate=req.contractor_historical_delay_rate
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@app.post("/api/predict/budget-overrun")
def predict_budget_overrun(req: BudgetOverrunRequest):
    try:
        result = ProjectRiskEngine.predict_budget_overrun(
            budget=req.budget,
            actual_cost=req.actual_cost,
            progress_percentage=req.progress_percentage,
            material_inflation_index=req.material_inflation_index
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@app.post("/api/evaluate/bids")
def evaluate_bids(req: BidEvaluationRequest):
    try:
        raw_bids = [b.model_dump() for b in req.bids]
        result = SmartBidEvaluator.evaluate_and_rank_bids(
            estimated_budget=req.estimated_budget,
            bids=raw_bids
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@app.post("/api/tender/extract-specs")
def extract_specs(req: DocumentAnalysisRequest):
    try:
        result = TenderDocumentAnalyzer.extract_specifications(req.document_text)
        return result
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@app.post("/api/contractor/score")
def score_contractor(req: ContractorScoreRequest):
    try:
        result = ContractorScorer.calculate_health_index(
            verification_status=req.verification_status,
            years_of_experience=req.years_of_experience,
            rating=req.rating,
            completed_projects=req.completed_projects,
            has_gst=req.has_gst,
            has_pan=req.has_pan,
            inspection_pass_rate=req.inspection_pass_rate
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
