// Assessment scoring utilities

export interface ScoringFormula {
  [scoreName: string]: string; // e.g., { "total": "sum(q0,q1,q2)", "mobility": "avg(q0,q1)" }
}

export interface ScoringThresholds {
  poor: number;
  fair: number;
  good: number;
}

export interface ConditionConfig {
  parentIndex: number; // Index of the parent question
  type: "equals" | "greater_than" | "less_than" | "contains" | "not_equals";
  value: string;
}

export function calculateScores(
  results: Record<string, any>,
  formulas: ScoringFormula,
  itemNames: string[]
): Record<string, number> {
  const scores: Record<string, number> = {};

  // Create a mapping from q0, q1, etc. to actual values
  const numericValues: Record<string, number> = {};
  itemNames.forEach((name, index) => {
    const result = results[name];
    if (result === "pass") {
      numericValues[`q${index}`] = 3; // Pass = 3 points
    } else if (result === "fail") {
      numericValues[`q${index}`] = 0; // Fail = 0 points
    } else if (typeof result === "number" || !isNaN(Number(result))) {
      numericValues[`q${index}`] = Number(result);
    } else {
      numericValues[`q${index}`] = 0;
    }
  });

  for (const [scoreName, formula] of Object.entries(formulas)) {
    if (!formula || formula.trim() === "") continue;

    try {
      // Extract question references (q0, q1, q2, etc.)
      const questionRefs = formula.match(/q\d+/g) || [];
      const values = questionRefs.map((ref) => numericValues[ref] || 0);

      if (values.length === 0) {
        scores[scoreName] = 0;
        continue;
      }

      // Parse and evaluate formula
      const lowerFormula = formula.toLowerCase().trim();

      if (lowerFormula.startsWith("sum(")) {
        scores[scoreName] = values.reduce((a, b) => a + b, 0);
      } else if (lowerFormula.startsWith("avg(")) {
        scores[scoreName] = values.reduce((a, b) => a + b, 0) / values.length;
      } else if (lowerFormula.startsWith("min(")) {
        scores[scoreName] = Math.min(...values);
      } else if (lowerFormula.startsWith("max(")) {
        scores[scoreName] = Math.max(...values);
      } else if (lowerFormula.startsWith("count(")) {
        // Count non-zero values
        scores[scoreName] = values.filter((v) => v > 0).length;
      } else if (lowerFormula.startsWith("percent(")) {
        // Percentage of passes (non-zero values)
        scores[scoreName] = Math.round(
          (values.filter((v) => v > 0).length / values.length) * 100
        );
      } else {
        // Try simple arithmetic: sum / divisor
        const divMatch = formula.match(/^sum\(([^)]+)\)\s*\/\s*(\d+)$/i);
        if (divMatch) {
          const sum = values.reduce((a, b) => a + b, 0);
          scores[scoreName] = sum / Number(divMatch[2]);
        } else {
          // Default to sum
          scores[scoreName] = values.reduce((a, b) => a + b, 0);
        }
      }

      // Round to 1 decimal place
      scores[scoreName] = Math.round(scores[scoreName] * 10) / 10;
    } catch (error) {
      console.error(`Error calculating score "${scoreName}":`, error);
      scores[scoreName] = 0;
    }
  }

  return scores;
}

export function getScoreInterpretation(
  score: number,
  thresholds: ScoringThresholds = { poor: 40, fair: 60, good: 80 }
): { label: string; variant: "destructive" | "secondary" | "default" | "outline" } {
  if (score >= thresholds.good) {
    return { label: "Excellent", variant: "default" };
  }
  if (score >= thresholds.fair) {
    return { label: "Good", variant: "secondary" };
  }
  if (score >= thresholds.poor) {
    return { label: "Fair", variant: "outline" };
  }
  return { label: "Needs Work", variant: "destructive" };
}

export function evaluateCondition(
  condition: ConditionConfig | null | undefined,
  results: Record<string, any>,
  itemNames: string[]
): boolean {
  if (!condition) return true; // No condition = always visible

  const parentName = itemNames[condition.parentIndex];
  if (!parentName) return true;

  const parentValue = results[parentName];
  if (parentValue === undefined || parentValue === null) return false;

  const conditionValue = condition.value;

  switch (condition.type) {
    case "equals":
      return String(parentValue).toLowerCase() === String(conditionValue).toLowerCase();
    case "not_equals":
      return String(parentValue).toLowerCase() !== String(conditionValue).toLowerCase();
    case "greater_than":
      return Number(parentValue) > Number(conditionValue);
    case "less_than":
      return Number(parentValue) < Number(conditionValue);
    case "contains":
      return String(parentValue).toLowerCase().includes(String(conditionValue).toLowerCase());
    default:
      return true;
  }
}
