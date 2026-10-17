"""
Risk Prediction Engine for Construction Projects
Predicts completion delay probability and budget overrun risk based on project metrics.
"""

from typing import Dict, Any, List
import math

class ProjectRiskEngine:
    @staticmethod
    def predict_delay_risk(
        planned_duration_days: int,
        days_elapsed: int,
        progress_percentage: float,
        weather_severity_index: float = 0.2, # 0.0 to 1.0
        defect_count: int = 0,
        contractor_historical_delay_rate: float = 0.1 # 0.0 to 1.0
    ) -> Dict[str, Any]:
        """
        Calculate expected project delay probability and estimated delay in days.
        """
        planned_duration = max(1, planned_duration_days)
        expected_progress = min(100.0, (days_elapsed / planned_duration) * 100.0)
        progress_variance = expected_progress - progress_percentage

        # Normalized progress lag factor (-1 to +1)
        lag_factor = max(0.0, progress_variance / 100.0)

        # Defect penalty (every 5 defects adds significant risk)
        defect_factor = min(1.0, defect_count / 15.0)

        # Weighted composite risk score
        raw_score = (
            (lag_factor * 0.45) +
            (weather_severity_index * 0.20) +
            (defect_factor * 0.20) +
            (contractor_historical_delay_rate * 0.15)
        )

        # Apply sigmoid function for smooth probability curve (0% to 100%)
        # Logistic midpoint at raw_score 0.35
        z = (raw_score - 0.35) * 8.0
        delay_probability = round(1.0 / (1.0 + math.exp(-z)), 4)
        delay_prob_percent = round(delay_probability * 100, 1)

        # Estimated delay days
        if delay_probability > 0.3:
            remaining_days = max(1, planned_duration - days_elapsed)
            estimated_delay_days = round(remaining_days * (delay_probability * 0.75))
        else:
            estimated_delay_days = 0

        # Determine risk level
        if delay_prob_percent >= 70:
            risk_tier = "CRITICAL"
        elif delay_prob_percent >= 45:
            risk_tier = "HIGH"
        elif delay_prob_percent >= 25:
            risk_tier = "MODERATE"
        else:
            risk_tier = "LOW"

        # Generate action recommendations
        recommendations: List[str] = []
        if lag_factor > 0.15:
            recommendations.append("Progress is trailing schedule by >15%. Deploy secondary shift or augment workforce.")
        if defect_count >= 5:
            recommendations.append(f"{defect_count} open inspection defects detected. Halt structural phase until rectified.")
        if weather_severity_index >= 0.5:
            recommendations.append("High adverse weather factor. Procure protective curing tarps and adjust concrete pouring windows.")
        if contractor_historical_delay_rate >= 0.3:
            recommendations.append("Contractor has historical delay profile. Institute bi-weekly executive milestone reviews.")
        if not recommendations:
            recommendations.append("Project tracking smoothly within expected timeline tolerances.")

        return {
            "delay_probability": delay_probability,
            "delay_probability_percent": delay_prob_percent,
            "estimated_delay_days": estimated_delay_days,
            "risk_tier": risk_tier,
            "metrics": {
                "planned_duration_days": planned_duration,
                "days_elapsed": days_elapsed,
                "progress_percentage": progress_percentage,
                "expected_progress": round(expected_progress, 1),
                "progress_lag": round(max(0.0, progress_variance), 1),
                "weather_severity_index": weather_severity_index,
                "defect_count": defect_count
            },
            "recommendations": recommendations
        }

    @staticmethod
    def predict_budget_overrun(
        budget: float,
        actual_cost: float,
        progress_percentage: float,
        material_inflation_index: float = 0.05 # 5% baseline inflation
    ) -> Dict[str, Any]:
        """
        Estimate budget overrun probability and projected final expenditure.
        """
        budget = max(1.0, float(budget))
        actual_cost = float(actual_cost)
        progress = max(1.0, float(progress_percentage))

        # Cost Performance Index (CPI) = Earned Value / Actual Cost
        # Earned Value (EV) = (progress% / 100) * budget
        earned_value = (progress / 100.0) * budget
        cpi = earned_value / actual_cost if actual_cost > 0 else 1.0

        # Estimate at Completion (EAC)
        if cpi > 0:
            estimated_final_cost = actual_cost + ((budget - earned_value) / cpi) * (1.0 + material_inflation_index)
        else:
            estimated_final_cost = budget * 1.5

        estimated_overrun = max(0.0, estimated_final_cost - budget)
        overrun_percent = round((estimated_overrun / budget) * 100.0, 2)

        # Overrun probability
        if overrun_percent > 20:
            overrun_prob = 0.88
            risk_tier = "CRITICAL"
        elif overrun_percent > 10:
            overrun_prob = 0.65
            risk_tier = "HIGH"
        elif overrun_percent > 2:
            overrun_prob = 0.38
            risk_tier = "MODERATE"
        else:
            overrun_prob = 0.12
            risk_tier = "LOW"

        recommended_contingency = round(budget * max(0.05, (overrun_percent / 100.0) * 0.8), 2)

        return {
            "budget": budget,
            "actual_cost": actual_cost,
            "progress_percentage": progress,
            "cost_performance_index": round(cpi, 3),
            "estimated_final_cost": round(estimated_final_cost, 2),
            "estimated_overrun_amount": round(estimated_overrun, 2),
            "overrun_percentage": overrun_percent,
            "overrun_probability": overrun_prob,
            "risk_tier": risk_tier,
            "recommended_contingency_buffer": recommended_contingency,
            "summary": (
                f"Projected final cost of INR {estimated_final_cost:,.2f} against allocated budget of INR {budget:,.2f}. "
                f"Variance: +{overrun_percent}% ({risk_tier} risk)."
            )
        }
