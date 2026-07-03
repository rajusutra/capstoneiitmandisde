// Turns the fatigue engine's flags into a plain-English explanation + suggestion.
// If ANTHROPIC_API_KEY is set, it asks Claude; otherwise (or if the call fails)
// it falls back to a simple template so the app always works.
const Anthropic = require('@anthropic-ai/sdk');

// Fallback used when there is no API key or the API call fails
function templateExplanation(employeeName, assessment) {
  if (assessment.flags.length === 0) {
    return {
      aiExplanation: `${employeeName}'s shift looks safe. No fatigue rules were violated.`,
      suggestedAlternative: 'No change needed.',
    };
  }
  return {
    aiExplanation:
      `${employeeName}'s shift is rated ${assessment.riskLevel.toUpperCase()} risk ` +
      `(score ${assessment.riskScore}/100) because: ${assessment.flags.join(' ')}`,
    suggestedAlternative:
      'Consider moving this shift to a later start time, assigning it to another available employee, ' +
      'or adding a rest day before it so all fatigue rules pass.',
  };
}

async function claudeExplanation(employeeName, assessment, shift) {
  const client = new Anthropic(); // reads ANTHROPIC_API_KEY from the environment

  const prompt =
    `You are a workforce safety assistant. A rule engine assessed a work shift:\n` +
    `Employee: ${employeeName}\n` +
    `Shift: ${new Date(shift.startTime).toUTCString()} to ${new Date(shift.endTime).toUTCString()}\n` +
    `Risk score: ${assessment.riskScore}/100 (${assessment.riskLevel})\n` +
    `Violated rules: ${assessment.flags.length ? assessment.flags.join('; ') : 'none'}\n\n` +
    `Write two short paragraphs for a manager. First: explain the risk in plain English (2-3 sentences). ` +
    `Second: suggest one concrete, safer alternative schedule (1-2 sentences). ` +
    `Do not invent new risk numbers — only use the score given above. ` +
    `Separate the two paragraphs with the line "---".`;

  const response = await client.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  // The response content is a list of blocks; take the text block
  const text = response.content.find((block) => block.type === 'text')?.text || '';
  const [explanation, suggestion] = text.split('---').map((part) => part.trim());

  return {
    aiExplanation: explanation || text,
    suggestedAlternative: suggestion || 'See explanation above.',
  };
}

const AIExplainer = {
  async explain(employeeName, assessment, shift) {
    if (!process.env.ANTHROPIC_API_KEY) {
      return templateExplanation(employeeName, assessment);
    }
    try {
      return await claudeExplanation(employeeName, assessment, shift);
    } catch (err) {
      console.error('AI explanation failed, using template fallback:', err.message);
      return templateExplanation(employeeName, assessment);
    }
  },
};

module.exports = AIExplainer;
