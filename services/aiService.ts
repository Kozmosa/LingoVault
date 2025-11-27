import { GoogleGenAI, Type } from "@google/genai";
import { AISettings, WordItem } from "../types";

// Helper to clean JSON from Markdown (```json ... ```)
const cleanJson = (text: string): string => {
  return text.replace(/```json/g, '').replace(/```/g, '').trim();
};

const PROMPT_TEMPLATE = (word: string) => 
  `Translate the English word "${word}" to Chinese (Simplified) and provide a short, helpful example sentence in English. 
   Return ONLY valid JSON in the following format:
   {
     "chinese": "中文翻译",
     "example": "English example sentence."
   }`;

// --- Providers ---

const callGemini = async (word: string, settings: AISettings): Promise<string> => {
  const apiKey = settings.apiKey || process.env.API_KEY;
  if (!apiKey) throw new Error("API Key missing");

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: settings.model || "gemini-2.5-flash",
    contents: PROMPT_TEMPLATE(word),
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          chinese: { type: Type.STRING },
          example: { type: Type.STRING }
        },
        required: ["chinese", "example"]
      }
    }
  });

  return response.text || "{}";
};

const callOpenAICompatible = async (word: string, settings: AISettings): Promise<string> => {
  if (!settings.apiKey) throw new Error("API Key missing");
  const baseUrl = settings.baseUrl || "https://api.openai.com/v1";
  
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${settings.apiKey}`
    },
    body: JSON.stringify({
      model: settings.model || "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are a helpful dictionary assistant. Always respond in JSON." },
        { role: "user", content: PROMPT_TEMPLATE(word) }
      ],
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI Error: ${err}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
};

const callAnthropic = async (word: string, settings: AISettings): Promise<string> => {
  if (!settings.apiKey) throw new Error("API Key missing");
  const baseUrl = settings.baseUrl || "https://api.anthropic.com/v1";

  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': settings.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true' // Required for client-side calls
    },
    body: JSON.stringify({
      model: settings.model || "claude-3-haiku-20240307",
      max_tokens: 1024,
      messages: [
        { role: "user", content: PROMPT_TEMPLATE(word) }
      ]
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic Error: ${err}`);
  }

  const data = await response.json();
  return data.content[0].text;
};

// --- Main Service Function ---

export const enhanceWord = async (englishWord: string, settings: AISettings): Promise<Partial<WordItem>> => {
  try {
    let jsonString = "";

    switch (settings.provider) {
      case 'gemini':
        jsonString = await callGemini(englishWord, settings);
        break;
      case 'openai':
      case 'custom':
        jsonString = await callOpenAICompatible(englishWord, settings);
        break;
      case 'anthropic':
        jsonString = await callAnthropic(englishWord, settings);
        break;
      default:
        throw new Error(`Unsupported provider: ${settings.provider}`);
    }

    const parsed = JSON.parse(cleanJson(jsonString));
    
    // Normalize casing from different models
    return {
      chinese: parsed.chinese || parsed.Chinese || parsed.meaning || "",
      example: parsed.example || parsed.Example || parsed.sentence || ""
    };
  } catch (error) {
    console.error("AI Enhancement failed:", error);
    throw error;
  }
};