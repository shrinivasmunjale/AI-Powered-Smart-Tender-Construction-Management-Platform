"""
Integration and Unit Tests for TenderBridge AI Engine
Verifies algorithms, output structures, and edge cases.
"""

import unittest
from engines.risk_engine import ProjectRiskEngine
from engines.bid_evaluator import SmartBidEvaluator
from engines.document_analyzer import TenderDocumentAnalyzer
from engines.contractor_scorer import ContractorScorer

class TestTenderBridgeAIEngines(unittest.TestCase):

    def test_delay_risk_prediction(self):
        result = ProjectRiskEngine.predict_delay_risk(
            planned_duration_days=300,
            days_elapsed=150,
            progress_percentage=25.0, # significantly lagging behind 50%
            weather_severity_index=0.6,
            defect_count=8
        )
        self.assertIn("delay_probability", result)
        self.assertIn("estimated_delay_days", result)
        self.assertIn("risk_tier", result)
        self.assertGreater(result["delay_probability_percent"], 40)
        self.assertIn(result["risk_tier"], ["HIGH", "CRITICAL"])
        self.assertTrue(len(result["recommendations"]) > 0)
        print("[PASS] Delay Risk Prediction Test:", result["risk_tier"], f"{result['delay_probability_percent']}%")

    def test_budget_overrun_prediction(self):
        result = ProjectRiskEngine.predict_budget_overrun(
            budget=10000000.0,
            actual_cost=7000000.0,
            progress_percentage=40.0 # spent 70% of budget for only 40% progress!
        )
        self.assertIn("estimated_final_cost", result)
        self.assertIn("overrun_percentage", result)
        self.assertGreater(result["estimated_final_cost"], 10000000.0)
        self.assertIn(result["risk_tier"], ["HIGH", "CRITICAL"])
        print("[PASS] Budget Overrun Test:", result["summary"])

    def test_smart_bid_evaluation(self):
        bids = [
            {
                "bid_id": "BID-1",
                "contractor_name": "Apex Builders",
                "proposed_amount": 9200000.0,
                "technical_score": 88.0,
                "completed_projects": 7,
                "contractor_rating": 4.6,
                "has_valid_gst": True,
                "has_valid_pan": True
            },
            {
                "bid_id": "BID-2",
                "contractor_name": "Lowball Underbidders",
                "proposed_amount": 5500000.0, # abnormally low < 70% of 10M
                "technical_score": 60.0,
                "completed_projects": 1,
                "contractor_rating": 3.0,
                "has_valid_gst": True,
                "has_valid_pan": True
            }
        ]
        result = SmartBidEvaluator.evaluate_and_rank_bids(
            estimated_budget=10000000.0,
            bids=bids
        )
        self.assertEqual(result["total_bids_evaluated"], 2)
        # Check that lowball bid has an anomaly flag
        lowball = [b for b in result["ranked_bids"] if b["bid_id"] == "BID-2"][0]
        self.assertTrue(any("UNDERBIDDING" in f for f in lowball["anomaly_flags"]))
        print("[PASS] Smart Bid Evaluation Test. Top Rank:", result["recommended_bid"]["contractor_name"])

    def test_document_extraction(self):
        sample_doc = """
        Tender Notice No: PWD/DELHI/2026/044
        Notice Inviting Tender for Construction of 4-Lane Elevated Flyover and Underpass.
        Estimated Cost: Rs 45,00,00,000. EMD: INR 90,00,000.
        Completion Period: 24 months.
        Mandatory Requirements:
        - Bidder must possess valid GST Registration Certificate and PAN Card.
        - Audited Balance Sheet showing turnover > 20 Cr.
        - Performance Bank Guarantee (PBG) of 5% within 15 days of LoA.
        - ISO 9001 certification.
        """
        result = TenderDocumentAnalyzer.extract_specifications(sample_doc)
        self.assertEqual(result["extracted_category"], "Roads & Highways")
        self.assertEqual(result["estimated_cost"], 450000000.0)
        self.assertEqual(result["emd_amount"], 9000000.0)
        self.assertIn("GST Registration Certificate", result["mandatory_documents"])
        print("[PASS] Document Analysis Test:", result["summary"])

    def test_contractor_scoring(self):
        result = ContractorScorer.calculate_health_index(
            verification_status="verified",
            years_of_experience=12,
            rating=4.8,
            completed_projects=15,
            has_gst=True,
            has_pan=True
        )
        self.assertGreaterEqual(result["health_index"], 85)
        self.assertEqual(result["classification"], "CLASS A - PRIME CONTRACTOR")
        print("[PASS] Contractor Scoring Test:", result["health_index"], result["badge"])

if __name__ == "__main__":
    unittest.main()
