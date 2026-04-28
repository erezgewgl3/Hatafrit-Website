// Admin: AI net-carbs estimator (CARB-AI v1.1).
// POST /api/admin/estimate-carbs
//
// Pure proxy + schema-constrainer over Anthropic Sonnet 4.6. Auth-gated; never
// touches the recipe DB; never persists anything. Returns the locked PRD §13 shape:
//   { perServingNetCarbs: number|null, totalNetCarbs: number,
//     servingsAssumed: number|null, breakdown: [{ingredient,estimatedCarbs,note}] }
//
// Threat model (T-CARBAI-01..06):
//   - requireAuth() gate (T-01)
//   - tool_use input_schema constrains response shape; max_tokens caps size (T-02)
//   - 15s server-side timeout via AbortSignal (T-03)
//   - Zero DB-helper imports — endpoint can only reach Anthropic (T-04)
//   - SDK errors do not interpolate ANTHROPIC_API_KEY (T-05)

import Anthropic from '@anthropic-ai/sdk';
import { requireAuth } from '../_lib/auth.js';

const MODEL = 'claude-sonnet-4-6';
const TIMEOUT_MS = 25000;
const MAX_TOKENS = 1024;

// PRD §13 sweetener rule — Hebrew, verbatim. Encoded in the system prompt so
// the model never confuses "ממתיק" with sugar.
const SWEETENER_RULE_HE = 'כל אזכור של "ממתיק" שווה ל-0 גרם פחמימות נטו. אל תניחי שמדובר בסוכר.';

const SYSTEM_PROMPT = [
  'את עוזרת תזונה למתכונים דלי-פחמימות (low-carb).',
  'המשתמשת מספקת רשימת מצרכים בעברית של מתכון, ואת מעריכה את כמות הפחמימות נטו (net carbs) בגרמים לכל מצרך.',
  'החזירי תמיד את התוצאה דרך הכלי report_net_carbs בלבד — אל תוסיפי טקסט חופשי.',
  '',
  'כללי חישוב:',
  '- ' + SWEETENER_RULE_HE,
  '- חלבונים ביצים: ~0.4g פחמימות נטו לחלבון.',
  '- חלמונים: ~0.6g פחמימות נטו לחלמון.',
  '- ביצה שלמה: ~1g פחמימות נטו.',
  '- אגוזים וקמחי אגוזים (שקדים, אגוזי לוז, מקדמיה): נטו ~5–10g/100g.',
  '- חמאה, שמן, שמנת מתוקה, שמנת חמוצה: 0g פחמימות נטו (קרוב לאפס).',
  '- שוקולד מריר 85%+: ~14g/100g; שוקולד מריר 70%: ~30g/100g.',
  '- אבקת קקאו לא ממותקת: ~7g נטו/100g.',
  '- חלב: ~5g/100ml. שמנת לבישול 38%: ~3g/100ml.',
  '- אם המצרך לא ברור — תני הערכה שמרנית והוסיפי הערה קצרה.',
  '',
  'אם מספר המנות (servingSize) ריק או לא מספרי, החזירי perServingNetCarbs=null ו-servingsAssumed=null,',
  'אבל עדיין חשבי totalNetCarbs ופירוט לכל מצרך.',
  'אחרת, perServingNetCarbs = totalNetCarbs / servingsAssumed (עיגול לעשירית).',
].join('\n');

// JSON schema mirrors PRD §13 verbatim. Used as tool_use input_schema so Claude
// can only return this exact shape. Any drift = tool call refusal at the SDK
// layer, not a malformed JSON parse downstream.
const REPORT_TOOL = {
  name: 'report_net_carbs',
  description: 'Report the per-ingredient net-carbs breakdown plus per-serving and total.',
  input_schema: {
    type: 'object',
    properties: {
      perServingNetCarbs: {
        type: ['number', 'null'],
        description: 'Net carbs per serving in grams, rounded to 1 decimal. null if servingSize was empty/non-numeric.',
      },
      totalNetCarbs: {
        type: 'number',
        description: 'Sum of breakdown[].estimatedCarbs in grams. Always present.',
      },
      servingsAssumed: {
        type: ['number', 'null'],
        description: 'The numeric servings count used. null if servingSize was empty/non-numeric.',
      },
      breakdown: {
        type: 'array',
        description: 'One row per ingredient in the input list.',
        items: {
          type: 'object',
          properties: {
            ingredient: { type: 'string', description: 'Original ingredient line.' },
            estimatedCarbs: { type: 'number', description: 'Net carbs in grams for this line.' },
            note: { type: 'string', description: 'Short Hebrew or English assumption note.' },
          },
          required: ['ingredient', 'estimatedCarbs', 'note'],
        },
      },
    },
    required: ['perServingNetCarbs', 'totalNetCarbs', 'servingsAssumed', 'breakdown'],
  },
};

function buildUserPrompt({ name, description, servingSize, ingredients }) {
  const parts = [];
  if (name) parts.push('שם המתכון: ' + String(name));
  if (description) parts.push('תיאור: ' + String(description));
  parts.push('מספר מנות (servingSize, ייתכן שריק): ' + String(servingSize || ''));
  parts.push('');
  parts.push('רשימת מצרכים:');
  parts.push(String(ingredients));
  parts.push('');
  parts.push('דווחי תוצאה דרך הכלי report_net_carbs.');
  return parts.join('\n');
}

export default async function handler(req, res) {
  if (!requireAuth(req, res)) return;
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const body = req.body || {};
  const ingredients = String(body.ingredients || '').trim();
  if (!ingredients) {
    res.status(400).json({ error: 'ingredients required' });
    return;
  }

  // Anthropic SDK reads ANTHROPIC_API_KEY from process.env automatically.
  const client = new Anthropic();

  let response;
  try {
    response = await client.messages.create(
      {
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        tools: [REPORT_TOOL],
        tool_choice: { type: 'tool', name: 'report_net_carbs' },
        messages: [
          {
            role: 'user',
            content: buildUserPrompt({
              name: body.name,
              description: body.description,
              servingSize: body.servingSize,
              ingredients,
            }),
          },
        ],
      },
      { signal: AbortSignal.timeout(TIMEOUT_MS) },
    );
  } catch (err) {
    // T-CARBAI-03: AbortSignal.timeout() throws an AbortError-shaped error
    // (DOMException name='TimeoutError' or 'AbortError' depending on runtime).
    const name = err && (err.name || err.constructor?.name);
    if (name === 'TimeoutError' || name === 'AbortError') {
      res.status(504).json({ error: 'estimation timeout' });
      return;
    }
    // T-CARBAI-05: Anthropic SDK errors do not interpolate the API key into
    // the message; surface the message string directly (matches recipes.js).
    res.status(500).json({ error: String(err && err.message || err) });
    return;
  }

  // Locate the tool_use block. With tool_choice forcing the tool, Claude must
  // emit exactly one tool_use; defensive search anyway.
  const toolBlock = Array.isArray(response?.content)
    ? response.content.find((b) => b && b.type === 'tool_use' && b.name === 'report_net_carbs')
    : null;
  if (!toolBlock || !toolBlock.input || typeof toolBlock.input !== 'object') {
    res.status(502).json({ error: 'no tool_use in response' });
    return;
  }

  const out = toolBlock.input;
  // T-CARBAI-02: validate shape one more time before forwarding.
  if (!Number.isFinite(out.totalNetCarbs) || !Array.isArray(out.breakdown)) {
    res.status(502).json({ error: 'invalid schema from model' });
    return;
  }

  res.status(200).json(out);
}
