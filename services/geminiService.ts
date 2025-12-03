import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY || '';
let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({ apiKey });
}

export const generateFlavorText = async (context: string): Promise<string> => {
  if (!ai) return "The mists of the unknown swirl around you (API Key missing).";

  try {
    const model = 'gemini-2.5-flash';
    const prompt = `
      You are the Dungeon Master for a retro isometric RPG game called "Legends of Gemini".
      The setting is medieval fantasy.
      Write a short, atmospheric, one-sentence description for the following event/context:
      "${context}"
      Keep it mysterious and engaging. Max 30 words.
    `;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });

    return response.text || "The winds howl silently.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "A strange static fills your mind.";
  }
};
