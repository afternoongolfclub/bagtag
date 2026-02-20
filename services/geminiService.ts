
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AIScanResult, ClubType } from "../types.ts";

export const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

function getAI() {
  const key = import.meta.env.VITE_GEMINI_API_KEY;
  if (!key) throw new Error('Gemini API key not configured');
  return new GoogleGenAI({ apiKey: key });
}

const clubSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    brand: { type: Type.STRING, description: "The manufacturer (e.g., TaylorMade, Callaway)." },
    model: { type: Type.STRING, description: "The specific model name (e.g., R540, Great Big Bertha)." },
    type: { 
      type: Type.STRING, 
      enum: Object.values(ClubType),
      description: "The category of the item." 
    },
    loft: { type: Type.STRING, description: "Loft in degrees (e.g., 9.5, 10.5)." },
    setComposition: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of clubs in the set if it is an iron set."
    },
    shaftMakeModel: { type: Type.STRING, description: "The manufacturer and model of the shaft." },
    shaftStiffness: { type: Type.STRING, description: "The flex of the shaft." },
  },
  required: ["brand", "model", "type"],
};

const receiptSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    price: { type: Type.NUMBER, description: "Total price on receipt." },
    purchaseDate: { type: Type.STRING, description: "Date in YYYY-MM-DD format." },
  },
  required: ["price"],
};

const tradeInSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    low: { type: Type.NUMBER, description: "Low estimate trade-in value in USD" },
    high: { type: Type.NUMBER, description: "High estimate trade-in value in USD" },
  },
  required: ["low", "high"],
};

export const analyzeClubImage = async (base64Data: string, mimeType: string): Promise<AIScanResult> => {
  try {
    const response = await getAI().models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType, data: base64Data } },
          { text: "Identify this golf equipment. Return Brand, Model, Type, and specifications." }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: clubSchema,
        temperature: 0.1,
      }
    });
    return response.text ? JSON.parse(response.text) : {};
  } catch (error) {
    console.error("Gemini analysis failed:", error);
    throw error;
  }
};

export const searchClubDatabase = async (query: string): Promise<AIScanResult> => {
  try {
    const response = await getAI().models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            text: `You are an expert golf equipment database (2000-present). Find item: "${query}".`
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: clubSchema,
        temperature: 0.2, 
      }
    });
    return response.text ? JSON.parse(response.text) : {};
  } catch (error) {
    console.error("Gemini database search failed:", error);
    throw error;
  }
};

export const getClubModels = async (brand: string, clubType: string): Promise<string[]> => {
  try {
    const response = await getAI().models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [{ text: `List 30 popular ${brand} ${clubType} models released since 2000.` }]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: { models: { type: Type.ARRAY, items: { type: Type.STRING } } },
          required: ["models"]
        },
        temperature: 0.3,
      }
    });
    const parsed = response.text ? JSON.parse(response.text) : { models: [] };
    return parsed.models || [];
  } catch (error) {
    console.error("Gemini model list fetch failed:", error);
    return [];
  }
};

export const analyzeReceiptImage = async (base64Data: string, mimeType: string): Promise<AIScanResult> => {
  try {
    const response = await getAI().models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType, data: base64Data } },
          { text: "Extract price and date from this receipt." }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: receiptSchema,
        temperature: 0.1,
      }
    });
    return response.text ? JSON.parse(response.text) : {};
  } catch (error) {
    console.error("Gemini receipt analysis failed:", error);
    throw error;
  }
};

export const getTradeInEstimate = async (brand: string, model: string, type: string, composition?: string[]): Promise<{low: number, high: number}> => {
  try {
    const setInfo = composition && composition.length > 0 ? ` (set: ${composition.join(', ')})` : '';
    const prompt = `You are a golf equipment valuation expert. Using PGA Value Guide pricing as your primary reference, estimate the current trade-in value for a used ${brand} ${model} ${type}${setInfo} in good condition. Base your low and high estimates on PGA Value Guide ranges for this equipment. Return values in USD.`;
    const response = await getAI().models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: tradeInSchema,
        temperature: 0.1,
      }
    });
    const parsed = response.text ? JSON.parse(response.text) : null;
    if (!parsed || !parsed.low || !parsed.high) throw new Error('Invalid response');
    return parsed;
  } catch (error) {
    throw error;
  }
};
