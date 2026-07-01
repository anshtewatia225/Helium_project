// Combines the rule result with an optional LLM second opinion, and computes the
// per-step timeline. Trusts rules when confident, defers to the LLM when not.

import { extractFeatures } from './features.js'
import { runRules } from './rules.js'

export function decide(ruleResult, llmResult) {
  if (!llmResult) {
    return {
      classification: ruleResult.classification,
      confidence: ruleResult.confidence,
      source: ruleResult.isStrong ? 'Rule engine' : 'Rule engine (low confidence)',
      agreement: null,
    }
  }

  const agree = ruleResult.classification === llmResult.classification

  if (agree) {
    // Both concur — boost confidence.
    return {
      classification: ruleResult.classification,
      confidence: Math.min(98, Math.round((ruleResult.confidence + llmResult.confidence) / 2) + 8),
      source: 'Hybrid — rules & LLM agree',
      agreement: true,
    }
  }

  if (ruleResult.isStrong) {
    // Strong rule signal; keep rules, note the override.
    return {
      classification: ruleResult.classification,
      confidence: ruleResult.confidence,
      source: 'Rule engine (overrode LLM)',
      agreement: false,
    }
  }

  // Rules uncertain — let the LLM lead.
  return {
    classification: llmResult.classification,
    confidence: llmResult.confidence,
    source: 'LLM (rules were uncertain)',
    agreement: false,
  }
}

// Classify each growing prefix to trace state changes across the session.
// Rules only, so re-running every prefix is cheap.
export function classifyTimeline(events, isReturning, disabledIds = []) {
  const steps = []
  for (let i = 1; i <= events.length; i++) {
    const prefix = events.slice(0, i)
    const result = runRules(extractFeatures(prefix, isReturning), disabledIds)
    steps.push({
      index: i,
      event: events[i - 1],
      classification: result.classification,
      confidence: result.confidence,
    })
  }
  return steps
}
