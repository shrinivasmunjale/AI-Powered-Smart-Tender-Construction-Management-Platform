# 🤖 TenderBridge AI & Analytics Engine (Python Microservice)

The **TenderBridge AI Engine** is a high-performance Python FastAPI microservice delivering predictive intelligence, algorithmic bid evaluation, risk forecasting, and natural language document extraction for construction and government e-procurement workflows.

---

## 🚀 Key Features

1. **Project Delay Risk Prediction** (`POST /api/predict/delay-risk`)
   - Uses multi-factor sigmoid logistic modeling combining milestone variance, weather disruption factors, inspection defect count, and contractor historical delivery speed.
   - Generates risk tier classification (`LOW`, `MODERATE`, `HIGH`, `CRITICAL`), delay probability percentage, expected delay in days, and actionable remediation steps.

2. **Budget Overrun Forecasting** (`POST /api/predict/budget-overrun`)
   - Computes Cost Performance Index (CPI) and Estimate at Completion (EAC) with inflation indexing.
   - Provides recommended contingency reserve buffer and variance percentage.

3. **Smart Multi-Criteria Bid Evaluation** (`POST /api/evaluate/bids`)
   - Multi-Criteria Decision Analysis (MCDA) weighing Price Competitiveness (40%), Technical Score (30%), Track Record (20%), and Statutory Compliance (10%).
   - Flags suspicious dumping / abnormally low tender bids (<70% of estimate) and excessive inflation bids (>115%).
   - Automatically ranks and recommends optimal contractor awardee.

4. **Tender Document & Specification NLP Extractor** (`POST /api/tender/extract-specs`)
   - Extracts estimated budget, Earnest Money Deposit (EMD), project duration, mandatory compliance certificates (GST, PAN, PBG, ISO), and domain category from tender text.

5. **Contractor Health & Trust Index** (`POST /api/contractor/score`)
   - Computes a 0–100 reliability rating and classification (`CLASS A Prime`, `CLASS B Qualified`, `CLASS C Standard`, `Provisional`).

---

## 🛠️ Installation & Running

### 1. Requirements
- Python 3.9+
- pip

### 2. Install Dependencies
```bash
cd py_project
pip install -r requirements.txt
```

### 3. Launch Server
Using runner script:
```bash
python run.py
```
Or directly with Uvicorn:
```bash
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

### 4. Interactive API Documentation
- **Swagger / OpenAPI UI**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **ReDoc**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

---

## 🧪 Running Unit & Integration Tests
```bash
python test_api.py
```

---

## 📡 API Sample Requests

### Predict Project Delay
```bash
curl -X POST http://127.0.0.1:8000/api/predict/delay-risk \
  -H "Content-Type: application/json" \
  -d '{
    "planned_duration_days": 365,
    "days_elapsed": 180,
    "progress_percentage": 30.0,
    "weather_severity_index": 0.4,
    "defect_count": 6
  }'
```

### Evaluate Bids
```bash
curl -X POST http://127.0.0.1:8000/api/evaluate/bids \
  -H "Content-Type: application/json" \
  -d '{
    "estimated_budget": 50000000,
    "bids": [
      {
        "bid_id": "B1",
        "contractor_name": "Skyline Infra Ltd",
        "proposed_amount": 48500000,
        "technical_score": 85,
        "completed_projects": 8,
        "contractor_rating": 4.5,
        "has_valid_gst": true,
        "has_valid_pan": true
      }
    ]
  }'
```
