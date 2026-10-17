"""
Tender Document & Specification NLP Extractor
Analyzes raw tender descriptions, notice invites, and scopes of work to extract
structured procurement parameters and compliance matrices.
"""

from typing import Dict, Any, List
import re

class TenderDocumentAnalyzer:
    @staticmethod
    def extract_specifications(document_text: str) -> Dict[str, Any]:
        """
        Extract key structured metadata from tender text.
        """
        text = document_text or ""
        
        # 1. Extract Estimated Cost / Budget
        # Patterns like: "Estimated Cost: INR 4,50,00,000", "Budget: Rs 5000000", "₹45,00,000"
        cost_match = re.search(r'(?:estimated\s*(?:cost|budget|value)|budget|cost)[\s:]*(?:rs\.?|inr|₹)?\s*([\d,]+(?:\.\d{2})?)', text, re.IGNORECASE)
        estimated_cost = None
        if cost_match:
            try:
                raw_num = cost_match.group(1).replace(',', '')
                estimated_cost = float(raw_num)
            except ValueError:
                pass

        # 2. Extract EMD (Earnest Money Deposit)
        emd_match = re.search(r'(?:emd|earnest\s*money|bid\s*security)[\s:]*(?:rs\.?|inr|₹)?\s*([\d,]+(?:\.\d{2})?)', text, re.IGNORECASE)
        emd_amount = None
        if emd_match:
            try:
                raw_emd = emd_match.group(1).replace(',', '')
                emd_amount = float(raw_emd)
            except ValueError:
                pass

        # 3. Extract Completion Period / Duration
        duration_match = re.search(r'(?:completion\s*(?:period|time)|duration|timeline)[\s:]*(\d+)\s*(months?|days?|years?)', text, re.IGNORECASE)
        duration_str = None
        if duration_match:
            duration_str = f"{duration_match.group(1)} {duration_match.group(2).lower()}"

        # 4. Mandatory Document Detection
        mandatory_docs = []
        doc_checks = [
            ("GST Registration Certificate", r'\bgst\b|\bgstin\b'),
            ("Permanent Account Number (PAN)", r'\bpan\b|\bpan\s*card\b'),
            ("Earnest Money Deposit (EMD) Bank Guarantee", r'\bemd\b|\bbid\s*security\b|\bbank\s*guarantee\b'),
            ("Performance Bank Guarantee (PBG)", r'\bpbg\b|\bperformance\s*guarantee\b'),
            ("Valid Contractor License / PWD Enlistment", r'\blicen[sc]e\b|\benlistment\b|\bregistration\s*certificate\b'),
            ("Audited Financial Balance Sheet (Last 3 Years)", r'\bbalance\s*sheet\b|\bturnover\b|\baudit\b'),
            ("Work Completion Certificates of Similar Works", r'\bexperience\b|\bcompletion\s*certificate\b|\bsimilar\s*works?\b'),
            ("ISO 9001 Quality Certification", r'\biso\b|\bquality\s*cert\b'),
            ("EPF and ESIC Registration", r'\bepf\b|\besic\b|\bprovident\s*fund\b')
        ]

        for doc_name, pattern in doc_checks:
            if re.search(pattern, text, re.IGNORECASE):
                mandatory_docs.append(doc_name)

        # Default fallback documents if none specifically detected
        if not mandatory_docs:
            mandatory_docs = [
                "GST Registration Certificate",
                "PAN Card",
                "Contractor License (PWD / CPWD / Equivalent)",
                "Past Work Experience Certificates"
            ]

        # 5. Extract Category / Domain
        category = "Civil Infrastructure"
        if re.search(r'\b(road|highway|bridge|flyover|asphalt|bitumen)\b', text, re.IGNORECASE):
            category = "Roads & Highways"
        elif re.search(r'\b(electrical|substation|transformer|wiring|lighting)\b', text, re.IGNORECASE):
            category = "Electrical & Power"
        elif re.search(r'\b(pipe|water|sewerage|drainage|plumbing|wtp)\b', text, re.IGNORECASE):
            category = "Water Supply & Sanitation"
        elif re.search(r'\b(building|hospital|school|commercial|structural)\b', text, re.IGNORECASE):
            category = "Building & Commercial Construction"

        # 6. Extract Eligibility Criteria summary
        eligibility = []
        if estimated_cost:
            min_turnover = round(estimated_cost * 0.40)
            eligibility.append(f"Minimum average annual financial turnover of INR {min_turnover:,.2f} in the last 3 financial years.")
        eligibility.append("Experience of having successfully completed similar works during the last 5 years.")
        eligibility.append("Active and unencumbered contractor license with verified tax compliance status.")

        return {
            "extracted_category": category,
            "estimated_cost": estimated_cost,
            "emd_amount": emd_amount,
            "completion_duration": duration_str or "12 months (standard)",
            "mandatory_documents": mandatory_docs,
            "eligibility_criteria": eligibility,
            "compliance_flags": {
                "requires_emd": emd_amount is not None or "Earnest Money Deposit (EMD) Bank Guarantee" in mandatory_docs,
                "requires_pbg": "Performance Bank Guarantee (PBG)" in mandatory_docs,
                "requires_iso": "ISO 9001 Quality Certification" in mandatory_docs
            },
            "summary": (
                f"Tender belongs to {category}. "
                f"Estimated cost: {('INR ' + format(estimated_cost, ',.2f')) if estimated_cost else 'To be verified'}. "
                f"Mandatory submission includes {len(mandatory_docs)} compliance documents."
            )
        }
