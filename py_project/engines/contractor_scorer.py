"""
Contractor Health & Trustworthiness Scoring Engine
Calculates contractor eligibility index and capacity rating based on regulatory standing,
work execution track record, defect rate, and financial stability.
"""

from typing import Dict, Any, List

class ContractorScorer:
    @staticmethod
    def calculate_health_index(
        verification_status: str,
        years_of_experience: int,
        rating: float,
        completed_projects: int,
        has_gst: bool,
        has_pan: bool,
        inspection_pass_rate: float = 0.95 # 0.0 to 1.0
    ) -> Dict[str, Any]:
        """
        Compute comprehensive contractor reliability score (0 - 100).
        """
        # 1. Statutory Compliance (30 points)
        compliance_score = 0
        if has_gst: compliance_score += 15
        if has_pan: compliance_score += 15
        if verification_status.lower() == 'verified':
            compliance_score = min(30, compliance_score + 5)
        elif verification_status.lower() == 'rejected':
            compliance_score = 0

        # 2. Track Record & Experience (35 points)
        # Experience: up to 15 points (1.5 pts per year, max 10 years)
        exp_score = min(15.0, max(0, years_of_experience) * 1.5)
        # Completed projects: up to 20 points (2 pts per project, max 10 projects)
        proj_score = min(20.0, max(0, completed_projects) * 2.0)
        track_score = exp_score + proj_score

        # 3. Quality & Site Performance (35 points)
        # Rating (0-5 stars) -> max 20 points
        rating_score = (max(0.0, min(5.0, rating)) / 5.0) * 20.0
        # Inspection pass rate -> max 15 points
        inspection_score = max(0.0, min(1.0, inspection_pass_rate)) * 15.0
        quality_score = rating_score + inspection_score

        # Total Composite Health Index
        total_index = round(compliance_score + track_score + quality_score, 1)

        # Classification
        if total_index >= 85:
            classification = "CLASS A - PRIME CONTRACTOR"
            bidding_limit = "Unrestricted (Eligible for Mega Infrastructure Projects > ₹50 Cr)"
            badge = "Platinum Verified"
        elif total_index >= 70:
            classification = "CLASS B - QUALIFIED CONTRACTOR"
            bidding_limit = "Eligible for Mid-to-Large Works (Up to ₹25 Cr)"
            badge = "Gold Verified"
        elif total_index >= 50:
            classification = "CLASS C - STANDARD CONTRACTOR"
            bidding_limit = "Eligible for Small-to-Medium Works (Up to ₹5 Cr)"
            badge = "Silver Verified"
        else:
            classification = "PROVISIONAL / RESTRICTED"
            bidding_limit = "Limited to Minor Maintenance Works (< ₹50 Lakhs). Document upgrades required."
            badge = "Under Review"

        actionable_steps: List[str] = []
        if not has_gst:
            actionable_steps.append("Submit valid 15-digit GSTIN registration certificate.")
        if not has_pan:
            actionable_steps.append("Link verified PAN card for withholding tax compliance.")
        if completed_projects < 3:
            actionable_steps.append("Upload completion certificates for past sub-contracts to boost track record.")
        if rating < 4.0 and completed_projects > 0:
            actionable_steps.append("Maintain higher inspection pass ratings on ongoing sites to boost performance score.")

        return {
            "health_index": total_index,
            "max_possible_score": 100,
            "classification": classification,
            "badge": badge,
            "bidding_capacity_limit": bidding_limit,
            "breakdown": {
                "statutory_compliance": round(compliance_score, 1),
                "experience_and_projects": round(track_score, 1),
                "quality_and_inspections": round(quality_score, 1)
            },
            "actionable_steps_to_improve": actionable_steps
        }
