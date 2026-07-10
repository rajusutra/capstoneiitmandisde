// Turns the fatigue engine's flags into a plain-English explanation + suggestion.
// Tries a local Ollama model first, falls back to Claude if configured, and
// falls back further to a plain template so the app always works.
const Anthropic = require('@anthropic-ai/sdk');

const OLLAMA_HOST = process.env.OLLAMA_HOST;
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'gemma2:2b';

// Fallback used when no LLM is reachable/configured
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

function buildPrompt(employeeName, assessment, shift) {
  return (
    `You are a workforce safety assistant. A rule engine assessed a work shift:\n` +
    `Employee: ${employeeName}\n` +
    `Shift: ${new Date(shift.startTime).toUTCString()} to ${new Date(shift.endTime).toUTCString()}\n` +
    `Risk score: ${assessment.riskScore}/100 (${assessment.riskLevel})\n` +
    `Violated rules: ${assessment.flags.length ? assessment.flags.join('; ') : 'none'}\n\n` +
    `Write two short paragraphs for a manager. First: explain the risk in plain English (2-3 sentences). ` +
    `Second: suggest one concrete, safer alternative schedule (1-2 sentences). ` +
    `Do not invent new risk numbers — only use the score given above. ` +
    `Separate the two paragraphs with the line "---".`
  );
}

function parseExplanation(text) {
  const [explanation, suggestion] = text.split('---').map((part) => part.trim());
  return {
    aiExplanation: explanation || text,
    suggestedAlternative: suggestion || 'See explanation above.',
  };
}

async function ollamaExplanation(employeeName, assessment, shift) {
  const prompt = buildPrompt(employeeName, assessment, shift);

  const response = await fetch(`${OLLAMA_HOST}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: OLLAMA_MODEL, prompt, stream: false }),
  });

  if (!response.ok) {
    throw new Error(`Ollama request failed with status ${response.status}`);
  }

  const data = await response.json();
  return parseExplanation(data.response || '');
}

async function claudeExplanation(employeeName, assessment, shift) {
  const client = new Anthropic(); // reads ANTHROPIC_API_KEY from the environment
  const prompt = buildPrompt(employeeName, assessment, shift);

  const response = await client.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  // The response content is a list of blocks; take the text block
  const text = response.content.find((block) => block.type === 'text')?.text || '';
  return parseExplanation(text);
}

const AIExplainer = {
  async explain(employeeName, assessment, shift) {
    if (OLLAMA_HOST) {
      try {
        return await ollamaExplanation(employeeName, assessment, shift);
      } catch (err) {
        console.error('Ollama explanation failed, trying Claude fallback:', err.message);
      }
    }

    if (process.env.ANTHROPIC_API_KEY) {
      try {
        return await claudeExplanation(employeeName, assessment, shift);
      } catch (err) {
        console.error('Claude explanation failed, using template fallback:', err.message);
      }
    }

    return templateExplanation(employeeName, assessment);
  },
};

module.exports = AIExplainer;
