/**
 * Bridge utility connecting Node.js backend with Python AI Engine (py_project)
 * Runs on http://127.0.0.1:8000
 */

const PYTHON_AI_URL = process.env.PYTHON_AI_URL || 'http://127.0.0.1:8000';

class PyAiBridge {
  static async isAvailable() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1000);
      const res = await fetch(`${PYTHON_AI_URL}/health`, { signal: controller.signal });
      clearTimeout(timeoutId);
      return res.ok;
    } catch {
      return false;
    }
  }

  static async predictDelayRisk(payload) {
    try {
      const res = await fetch(`${PYTHON_AI_URL}/api/predict/delay-risk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(`Python AI error: ${res.statusText}`);
      return await res.json();
    } catch (err) {
      console.warn('PyAI predictDelayRisk fallback:', err.message);
      // Fallback calculation in JS
      const planned = payload.planned_duration_days || 100;
      const elapsed = payload.days_elapsed || 0;
      const progress = payload.progress_percentage || 0;
      const expected = (elapsed / planned) * 100;
      const lag = Math.max(0, expected - progress);
      const isHigh = lag > 15;
      return {
        delay_probability_percent: Math.min(95, Math.round(lag * 2.2)),
        risk_tier: isHigh ? 'HIGH' : lag > 5 ? 'MODERATE' : 'LOW',
        estimated_delay_days: Math.round(lag * 1.5),
        recommendations: [isHigh ? 'Augment site labor to recover schedule.' : 'Pace aligns with tolerance limits.']
      };
    }
  }

  static async predictBudgetOverrun(payload) {
    try {
      const res = await fetch(`${PYTHON_AI_URL}/api/predict/budget-overrun`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(`Python AI error: ${res.statusText}`);
      return await res.json();
    } catch (err) {
      console.warn('PyAI predictBudgetOverrun fallback:', err.message);
      const budget = payload.budget || 1;
      const actual = payload.actual_cost || 0;
      const progress = payload.progress_percentage || 1;
      const projected = (actual / progress) * 100;
      const overrun = Math.max(0, projected - budget);
      return {
        estimated_final_cost: Math.round(projected),
        estimated_overrun_amount: Math.round(overrun),
        overrun_percentage: Math.round((overrun / budget) * 100),
        risk_tier: overrun > 0 ? 'HIGH' : 'LOW',
        recommended_contingency_buffer: Math.round(budget * 0.08)
      };
    }
  }

  static async evaluateBids(payload) {
    try {
      const res = await fetch(`${PYTHON_AI_URL}/api/evaluate/bids`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(`Python AI error: ${res.statusText}`);
      return await res.json();
    } catch (err) {
      console.warn('PyAI evaluateBids fallback:', err.message);
      return null;
    }
  }
}

module.exports = PyAiBridge;
