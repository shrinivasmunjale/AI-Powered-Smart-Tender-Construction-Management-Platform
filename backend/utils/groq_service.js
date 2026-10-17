const Groq = require('groq-sdk');

let groqClient = null;

function getGroqClient() {
  if (!groqClient && process.env.GROQ_API_KEY) {
    try {
      groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
    } catch (err) {
      console.warn('Groq client initialization warning:', err.message);
    }
  }
  return groqClient;
}

const SYSTEM_PROMPT = `You are "TenderBridge AI", an expert AI Assistant specialized in Government e-Procurement, Civil Construction Management, Public Works Department (PWD/CPWD) guidelines, General Financial Rules (GFR 2017), tender bidding, site inspections, and contractor milestone payments.

Your responsibilities:
1. Provide accurate, professional, and practical advice on tender eligibility, bid documents, bank guarantees (EMD/PBG), and technical proposals.
2. Explain the multi-tier payment workflow: Contractor Milestone Claim -> Site Engineer Field Verification -> Finance Officer Approval -> RTGS/Escrow Release.
3. Assist contractors in meeting GST, PAN, technical compliance, and ISO quality standards.
4. Help government officials review contractor performance, delay risks, and material tracking.
5. Format your output clearly using clean markdown, bullet points, and bold key terms. Keep answers concise, highly informative, and easy to read.`;

/**
 * Generate chat completion using Groq LLM with smart fallback
 */
async function getGroqChatCompletion(userPrompt, conversationHistory = [], userRole = 'contractor') {
  const client = getGroqClient();

  if (client && process.env.GROQ_API_KEY) {
    try {
      // Build messages array
      const messages = [
        {
          role: 'system',
          content: `${SYSTEM_PROMPT}\n\nCurrent user role: ${userRole}. Tailor recommendations specifically for this role.`
        }
      ];

      // Add last 6 messages of conversation history for context
      if (Array.isArray(conversationHistory)) {
        conversationHistory.slice(-6).forEach(msg => {
          if (msg.role === 'user' || msg.role === 'assistant') {
            messages.push({
              role: msg.role,
              content: String(msg.content || '')
            });
          }
        });
      }

      // Add latest prompt
      messages.push({
        role: 'user',
        content: userPrompt
      });

      // Try Llama 3.3 70B or Llama 3.1 8B on Groq
      const modelsToTry = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];
      let lastError = null;

      for (const model of modelsToTry) {
        try {
          const completion = await client.chat.completions.create({
            messages,
            model,
            temperature: 0.4,
            max_tokens: 1024,
          });

          const reply = completion.choices[0]?.message?.content;
          if (reply && reply.trim().length > 0) {
            return {
              content: reply.trim(),
              provider: 'groq',
              model
            };
          }
        } catch (mErr) {
          lastError = mErr;
          console.warn(`Groq model ${model} failed, trying next:`, mErr.message);
        }
      }
    } catch (err) {
      console.warn('Groq completion failed, falling back to local procurement reasoning:', err.message);
    }
  }

  // Fallback to intelligent rule-based procurement reasoning
  return {
    content: generateLocalProcurementResponse(userPrompt, userRole),
    provider: 'local_procurement_engine',
    model: 'tenderbridge-rule-v1'
  };
}

/**
 * Intelligent domain-specific rule-based fallback response generator
 */
function generateLocalProcurementResponse(message, userRole) {
  const lower = message.toLowerCase();

  if (lower.includes('payment') || lower.includes('bill') || lower.includes('invoice') || lower.includes('money') || lower.includes('release')) {
    return `### 💳 Payment & Billing Workflow

In the TenderBridge system, payments strictly follow the **3-Tier Approval Workflow**:

1. **Contractor Milestone Request**:
   - The contractor submits a payment claim against an assigned project with completion proofs.
   - 18% GST and standard statutory tax deductions (TDS 2%) are auto-computed.
2. **Site Engineer Verification**:
   - Site inspection reports, quality checklists, and physical progress are verified.
   - The Engineer certifies the bill and attaches verification notes.
3. **Finance Officer Release**:
   - Finance audits the budget allocation and authorizes fund disbursement.
   - An official GST Tax Invoice with unique Invoice Number (e.g. \`INV-2026-...\`) is generated and funds are released.

*Tip: You can monitor status updates under the **Payments** tab in your dashboard.*`;
  }

  if (lower.includes('apply') || lower.includes('bid') || lower.includes('submit') || lower.includes('tender')) {
    return `### 📋 Step-by-Step Tender Bidding Guide

To bid on active tenders:

1. **Verify Your Profile**: Ensure your PAN, GSTIN, and registration certificates are uploaded and verified.
2. **Check Eligibility**: Verify technical category (Roads, Bridges, Commercial, Electrical) and minimum turnover requirements.
3. **Download Tender Documents**: Review the BOQ (Bill of Quantities) and Technical Specifications.
4. **Prepare Proposal**:
   - Technical Bid (Experience certificates, machinery list, staffing)
   - Financial Bid (Itemized competitive pricing conforming to CPWD/PWD schedule)
5. **Submit Prior to Closing Date**: Once submitted, you will receive an audit timestamp and bid receipt.`;
  }

  if (lower.includes('document') || lower.includes('gst') || lower.includes('pan') || lower.includes('certificate')) {
    return `### 📄 Mandatory Documents for Verification

To achieve **Verified Contractor** status:

- **GST Registration Certificate** (Form GST REG-06)
- **Permanent Account Number (PAN)** card of entity / proprietor
- **Company Incorporation / Registration** (MCA / Registrar of Firms)
- **Work Experience Certificates**: Completion certificates of similar projects in the last 3 financial years
- **Bank Solvency Certificate / Audited Balance Sheets** for turnover verification
- **EPF / ESIC Registration** (if workforce exceeds statutory limits)`;
  }

  if (lower.includes('inspection') || lower.includes('quality') || lower.includes('defect') || lower.includes('site')) {
    return `### 🏗️ Site Inspection & Quality Compliance

Site inspections ensure construction meets technical specifications:

- **GPS Tagged Field Notes**: Engineers log field observations with geo-coordinates.
- **Defect Tracking**: Any structural, material, or safety defects must be rectified within the notice period before payment milestones can be certified.
- **Material Verification**: Batch test certificates for cement (OPC 43/53), steel (Fe 500D), and concrete cubes.`;
  }

  if (lower.includes('py') || lower.includes('risk') || lower.includes('predict') || lower.includes('ai') || lower.includes('overrun')) {
    return `### 🤖 TenderBridge AI & Python Analytics

Our Python AI Engine provides predictive capabilities:

- **Delay Risk Prediction**: Analyzes milestone pace, weather conditions, defect density, and past contractor track record to forecast potential delays.
- **Budget Overrun Forecast**: Evaluates material consumption variations and price escalation indices.
- **Smart Bid Comparison**: Automatically scores multi-parameter tenders (Price 40%, Technical 30%, Track Record 20%, Compliance 10%).`;
  }

  return `### 🤖 TenderBridge AI Assistant

I am here to assist you with:
- **Tender Procurement & Bidding**: Eligibility criteria, document checklists, and submission guidelines.
- **Project Execution**: Milestones, scheduling, and delay mitigation.
- **Payments & Billing**: Advance, milestone, and final settlement workflows.
- **Contractor Compliance**: GST, PAN, licensing, and corporate profile verification.

Please let me know which project, tender, or workflow you would like assistance with!`;
}

module.exports = {
  getGroqChatCompletion,
  generateLocalProcurementResponse
};
