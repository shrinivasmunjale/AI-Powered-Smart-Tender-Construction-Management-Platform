"""
Smart Tender Bid Evaluation & Multi-Criteria Ranking Engine
Implements Analytic Hierarchy Process (AHP) / Multi-Criteria Decision Analysis (MCDA)
for public procurement tender awards.
"""

from typing import List, Dict, Any
import numpy as np

class SmartBidEvaluator:
    # Standard Government Procurement Weightings
    WEIGHT_PRICE = 0.40          # 40%
    WEIGHT_TECHNICAL = 0.30      # 30%
    WEIGHT_TRACK_RECORD = 0.20   # 20%
    WEIGHT_COMPLIANCE = 0.10     # 10%

    @classmethod
    def evaluate_and_rank_bids(
        cls,
        estimated_budget: float,
        bids: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Evaluate and rank all contractor bids for a tender.
        Each bid must contain:
        - bid_id: str or int
        - contractor_name: str
        - proposed_amount: float
        - technical_score: float (0 - 100)
        - completed_projects: int
        - contractor_rating: float (0 - 5.0)
        - has_valid_gst: bool
        - has_valid_pan: bool
        """
        if not bids:
            return {
                "ranked_bids": [],
                "recommended_bid": None,
                "summary": "No bids provided for evaluation."
            }

        evaluated_bids = []
        amounts = [float(b.get("proposed_amount", 0)) for b in bids if float(b.get("proposed_amount", 0)) > 0]
        min_amount = min(amounts) if amounts else estimated_budget

        for bid in bids:
            amount = float(bid.get("proposed_amount", 0))
            tech_score = float(bid.get("technical_score", 70))
            rating = float(bid.get("contractor_rating", 3.5))
            completed_count = int(bid.get("completed_projects", 0))
            valid_gst = bool(bid.get("has_valid_gst", True))
            valid_pan = bool(bid.get("has_valid_pan", True))

            # 1. Price Score (L1 formula: (MinPrice / BidPrice) * 100)
            if amount > 0:
                price_score = min(100.0, (min_amount / amount) * 100.0)
            else:
                price_score = 0.0

            # 2. Technical Proposal Score (0 - 100)
            norm_tech_score = max(0.0, min(100.0, tech_score))

            # 3. Track Record Score (Normalized out of 100)
            # Rating (max 5) is 50%, completed projects (up to 10) is 50%
            rating_comp = (rating / 5.0) * 50.0
            projects_comp = min(50.0, (completed_count / 10.0) * 50.0)
            track_record_score = rating_comp + projects_comp

            # 4. Compliance Score
            compliance_score = 0.0
            if valid_gst: compliance_score += 50.0
            if valid_pan: compliance_score += 50.0

            # Weighted Composite Final Score
            composite_score = round(
                (price_score * cls.WEIGHT_PRICE) +
                (norm_tech_score * cls.WEIGHT_TECHNICAL) +
                (track_record_score * cls.WEIGHT_TRACK_RECORD) +
                (compliance_score * cls.WEIGHT_COMPLIANCE),
                2
            )

            # Anomaly / Risk Flags
            anomaly_flags = []
            # Abnormally low tender check (below 70% of estimated budget)
            if estimated_budget > 0 and amount < (estimated_budget * 0.70):
                anomaly_flags.append(
                    f"POTENTIAL_UNDERBIDDING: Bid is {round((1 - amount/estimated_budget)*100)}% below government estimate. "
                    "Risk of abandonment or quality compromise."
                )

            # Price escalation check (above 115% of estimated budget)
            if estimated_budget > 0 and amount > (estimated_budget * 1.15):
                anomaly_flags.append(
                    f"HIGH_QUOTATION: Bid exceeds engineer estimate by {round((amount/estimated_budget - 1)*100)}%."
                )

            if not valid_gst or not valid_pan:
                anomaly_flags.append("COMPLIANCE_DEFICIT: Missing verified GSTIN or PAN records.")

            evaluated_bids.append({
                "bid_id": bid.get("bid_id"),
                "contractor_name": bid.get("contractor_name", "Unknown Contractor"),
                "proposed_amount": amount,
                "amount_vs_estimate_percent": round(((amount - estimated_budget) / estimated_budget) * 100.0, 1) if estimated_budget > 0 else 0,
                "scores": {
                    "price_score": round(price_score, 1),
                    "technical_score": round(norm_tech_score, 1),
                    "track_record_score": round(track_record_score, 1),
                    "compliance_score": round(compliance_score, 1),
                    "composite_score": composite_score
                },
                "anomaly_flags": anomaly_flags,
                "is_qualified": len(anomaly_flags) == 0 or "COMPLIANCE_DEFICIT" not in str(anomaly_flags)
            })

        # Rank bids descending by composite score
        ranked = sorted(evaluated_bids, key=lambda x: x["scores"]["composite_score"], reverse=True)
        for rank_idx, item in enumerate(ranked, start=1):
            item["rank"] = rank_idx

        winner = ranked[0] if ranked else None

        return {
            "estimated_budget": estimated_budget,
            "total_bids_evaluated": len(ranked),
            "ranked_bids": ranked,
            "recommended_bid": winner,
            "evaluation_criteria_weights": {
                "price": f"{int(cls.WEIGHT_PRICE * 100)}%",
                "technical": f"{int(cls.WEIGHT_TECHNICAL * 100)}%",
                "track_record": f"{int(cls.WEIGHT_TRACK_RECORD * 100)}%",
                "compliance": f"{int(cls.WEIGHT_COMPLIANCE * 100)}%"
            },
            "recommendation_summary": (
                f"Top Ranked Bidder: {winner['contractor_name']} with composite score of {winner['scores']['composite_score']}/100. "
                f"Quoted INR {winner['proposed_amount']:,.2f}." if winner else "No valid recommendations."
            )
        }
