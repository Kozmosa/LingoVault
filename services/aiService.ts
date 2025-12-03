import { GoogleGenAI, Type } from "@google/genai";
import { AISettings, SmartImportFieldMap, SmartImportPlan, WordItem } from "../types";

type ResponseFormat = "json_object";

interface ProviderRequest {
  systemPrompt: string;
  userPrompt: string;
  responseFormat?: ResponseFormat;
  geminiSchema?: Type;
}

// Helper to clean JSON from Markdown (```json ... ```)
const cleanJson = (text: string): string => {
  return text.replace(/```json/g, '').replace(/```/g, '').trim();
};

const ENHANCE_PROMPT = (word: string) => 
  `Translate the English word "${word}" to Chinese (Simplified) and provide a short, helpful example sentence in English. 
   Return ONLY valid JSON in the following format:
   {
     "chinese": "中文翻译",
     "example": "English example sentence."
   }`;

// --- Providers ---

const callGemini = async (settings: AISettings, request: ProviderRequest): Promise<string> => {
  const apiKey = settings.apiKey || process.env.API_KEY;
  if (!apiKey) throw new Error("API Key missing");

  const ai = new GoogleGenAI({ apiKey });
  const config: Record<string, unknown> = {
    responseMimeType: "application/json"
  };

  if (request.geminiSchema) {
    config.responseSchema = request.geminiSchema;
  }

  const response = await ai.models.generateContent({
    model: settings.model || "gemini-2.5-flash",
    contents: `${request.systemPrompt}\n\n${request.userPrompt}`,
    config: config as any
  });

  return response.text || "{}";
};

const callOpenAICompatible = async (settings: AISettings, request: ProviderRequest): Promise<string> => {
  if (!settings.apiKey) throw new Error("API Key missing");
  const baseUrl = settings.baseUrl || "https://api.openai.com/v1";

  const body: Record<string, unknown> = {
    model: settings.model || "gpt-3.5-turbo",
    temperature: 0,
    messages: [
      { role: "system", content: request.systemPrompt },
      { role: "user", content: request.userPrompt }
    ]
  };

  if (request.responseFormat) {
    body.response_format = { type: request.responseFormat };
  }

  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${settings.apiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI Error: ${err}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
};

const callAnthropic = async (settings: AISettings, request: ProviderRequest): Promise<string> => {
  if (!settings.apiKey) throw new Error("API Key missing");
  const baseUrl = settings.baseUrl || "https://api.anthropic.com/v1";

  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': settings.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: settings.model || "claude-3-haiku-20240307",
      max_tokens: 1024,
      system: request.systemPrompt,
      messages: [
        { role: "user", content: request.userPrompt }
      ]
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic Error: ${err}`);
  }

  const data = await response.json();
  const text = data?.content?.[0]?.text;
  if (!text) {
    throw new Error("Anthropic response missing text content");
  }
  return text;
};

const executeProviderRequest = async (settings: AISettings, request: ProviderRequest): Promise<string> => {
  switch (settings.provider) {
    case 'gemini':
      return callGemini(settings, request);
    case 'openai':
    case 'custom':
      return callOpenAICompatible(settings, request);
    case 'anthropic':
      return callAnthropic(settings, request);
    default:
      throw new Error(`Unsupported provider: ${settings.provider}`);
  }
};

// --- Main Service Function ---

export const enhanceWord = async (englishWord: string, settings: AISettings): Promise<Partial<WordItem>> => {
  try {
    const jsonString = await executeProviderRequest(settings, {
      systemPrompt: "You are a helpful dictionary assistant. Always respond in strict JSON.",
      userPrompt: ENHANCE_PROMPT(englishWord),
      responseFormat: "json_object",
      geminiSchema: {
        type: Type.OBJECT,
        properties: {
          chinese: { type: Type.STRING },
          example: { type: Type.STRING }
        },
        required: ["chinese", "example"]
      }
    });

    const parsed = JSON.parse(cleanJson(jsonString));

    return {
      chinese: parsed.chinese || parsed.Chinese || parsed.meaning || "",
      example: parsed.example || parsed.Example || parsed.sentence || ""
    };
  } catch (error) {
    console.error("AI Enhancement failed:", error);
    throw error;
  }
};

const SMART_IMPORT_SYSTEM_PROMPT =
  "You are a data onboarding assistant that designs safe import mappings. Always reply with valid JSON that matches the requested schema.";

const SMART_IMPORT_PROMPT = (sample: string) =>
  [
    "Analyze the following sample data (first rows provided):",
    sample,
    "Infer the most likely structure and return JSON describing how to map the content into a vocabulary list with English word (english), Chinese meaning (chinese), example sentence (example), and optional tags (tags).",
    "Follow this JSON structure exactly:",
    `{
  "format": "csv|tsv|json|text",
  "delimiter": "string or omit",
  "hasHeader": true,
  "skipRows": 0,
  "recordPath": "dot.path or omit",
  "fieldMap": {
    "english": "column or path",
    "chinese": "column or path",
    "example": "column or path",
    "tags": "column or path"
  },
  "notes": "optional guidance",
  "confidence": 0.0
}`,
    "Ensure english always maps to the column/path that best represents the base vocabulary."
  ].join("\n\n");

const SMART_IMPORT_SCHEMA: Type = {
  type: Type.OBJECT,
  properties: {
    format: { type: Type.STRING },
    delimiter: { type: Type.STRING },
    hasHeader: { type: Type.BOOLEAN },
    skipRows: { type: Type.NUMBER },
    recordPath: { type: Type.STRING },
    notes: { type: Type.STRING },
    confidence: { type: Type.NUMBER },
    fieldMap: {
      type: Type.OBJECT,
      properties: {
        english: { type: Type.STRING },
        chinese: { type: Type.STRING },
        example: { type: Type.STRING },
        tags: { type: Type.STRING }
      }
    }
  },
  required: ["format", "fieldMap"]
};

const coerceField = (value: unknown): string | undefined => {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  return undefined;
};

const pickFirst = (candidates: Array<unknown>): string | undefined => {
  for (const candidate of candidates) {
    const coerced = coerceField(candidate);
    if (coerced) return coerced;
  }
  return undefined;
};

const normalizeFieldMap = (rawFieldMap: unknown): SmartImportFieldMap => {
  if (!rawFieldMap || typeof rawFieldMap !== "object") {
    return {};
  }

  const fieldMap = rawFieldMap as Record<string, unknown>;

  const english = pickFirst([
    fieldMap.english,
    fieldMap.English,
    fieldMap.word,
    fieldMap.Word,
    fieldMap.column1,
    fieldMap.Column1
  ]);

  const chinese = pickFirst([
    fieldMap.chinese,
    fieldMap.Chinese,
    fieldMap.meaning,
    fieldMap.translation,
    fieldMap.column2,
    fieldMap.Column2
  ]);

  const example = pickFirst([
    fieldMap.example,
    fieldMap.Example,
    fieldMap.sentence,
    fieldMap.Sentence,
    fieldMap.column3,
    fieldMap.Column3
  ]);

  const tags = pickFirst([
    fieldMap.tags,
    fieldMap.Tags,
    fieldMap.category,
    fieldMap.Category
  ]);

  return {
    english,
    chinese,
    example,
    tags
  };
};

const normalizeSmartImportPlan = (raw: any): SmartImportPlan => {
  const allowedFormats: SmartImportPlan["format"][] = ["csv", "tsv", "json", "text"];
  const formatCandidate = typeof raw?.format === "string" ? raw.format.toLowerCase() : "csv";
  const format = allowedFormats.includes(formatCandidate as SmartImportPlan["format"])
    ? (formatCandidate as SmartImportPlan["format"])
    : "csv";

  const plan: SmartImportPlan = {
    format,
    delimiter: coerceField(raw?.delimiter),
    hasHeader: typeof raw?.hasHeader === "boolean" ? raw.hasHeader : undefined,
    skipRows: typeof raw?.skipRows === "number" ? Math.max(0, Math.floor(raw.skipRows)) : undefined,
    recordPath: coerceField(raw?.recordPath),
    fieldMap: normalizeFieldMap(raw?.fieldMap),
    notes: coerceField(raw?.notes),
    confidence: typeof raw?.confidence === "number" ? raw.confidence : undefined
  };

  if (plan.format === "csv" && !plan.delimiter) {
    plan.delimiter = ",";
  }

  if (plan.format === "tsv" && !plan.delimiter) {
    plan.delimiter = "\t";
  }

  if (plan.format === "text" && !plan.delimiter) {
    plan.delimiter = "\t";
  }

  if (!plan.fieldMap.english) {
    plan.fieldMap.english = "column1";
  }

  return plan;
};

export const generateSmartImportPlan = async (
  sampleData: string,
  settings: AISettings
): Promise<SmartImportPlan> => {
  try {
    const jsonString = await executeProviderRequest(settings, {
      systemPrompt: SMART_IMPORT_SYSTEM_PROMPT,
      userPrompt: SMART_IMPORT_PROMPT(sampleData),
      responseFormat: "json_object",
      geminiSchema: SMART_IMPORT_SCHEMA
    });

    const parsed = JSON.parse(cleanJson(jsonString));
    return normalizeSmartImportPlan(parsed);
  } catch (error) {
    console.error("Smart import plan generation failed:", error);
    throw error;
  }
};