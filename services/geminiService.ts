import { GoogleGenAI } from "@google/genai";
import { GenerationResult, Lead } from "../types";

// Helper to parse JSON from a markdown code block
function extractJsonFromMarkdown(text: string): any[] {
  try {
    // Attempt to find JSON inside ```json blocks
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch && jsonMatch[1]) {
      return JSON.parse(jsonMatch[1]);
    }
    // Fallback: Try to find just array brackets
    const arrayMatch = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (arrayMatch) {
      return JSON.parse(arrayMatch[0]);
    }
    return [];
  } catch (e) {
    console.error("Failed to parse JSON from Gemini response", e);
    return [];
  }
}

export const searchLeads = async (industry: string, location: string, limit: number = 10): Promise<GenerationResult> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // We cannot use responseMimeType: 'application/json' with googleSearch tool.
  // So we rely on prompt engineering to get JSON.
  const prompt = `
    I need you to act as a lead generation researcher.
    Task: Find approximately ${limit} distinct professional entities for the category "${industry}" in or near "${location}".
    
    For each business, use Google Search to find:
    1. Business Name
    2. Website URL (Extremely important, look for the official site)
    3. Phone Number
    4. Physical Address (City/Street)
    5. Email Address (if publicly visible on contact pages)
    6. Social Media Profiles (Facebook, Instagram, LinkedIn, Twitter/X) - Look specifically for these.
    
    Output Format:
    Strictly output a JSON array inside a markdown code block (\`\`\`json). 
    The schema for objects in the array should be:
    {
      "id": "unique_id",
      "name": "string",
      "category": "string (e.g. Dentist, Roofer)",
      "address": "string",
      "phone": "string",
      "website": "string",
      "email": "string (or null if not found)",
      "socials": [
        { "platform": "Facebook", "url": "string" },
        { "platform": "Instagram", "url": "string" },
        { "platform": "LinkedIn", "url": "string" }
      ]
    }

    Do not include any conversational text before or after the code block. Just the JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        // temperature: 0.1 // Low temperature for deterministic formatting
      }
    });

    const rawText = response.text || "";
    
    // Extract grounding metadata (sources)
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = groundingChunks
      .map(chunk => chunk.web)
      .filter((web): web is { uri: string; title: string } => !!web && !!web.uri);

    const parsedLeads = extractJsonFromMarkdown(rawText);

    // Sanitize and map to ensure type safety
    const leads: Lead[] = parsedLeads.map((item: any, index: number) => ({
      id: item.id || `lead-${Date.now()}-${index}`,
      name: item.name || "Unknown Business",
      category: item.category || industry,
      address: item.address,
      phone: item.phone,
      website: item.website,
      email: item.email,
      socials: Array.isArray(item.socials) ? item.socials : []
    }));

    return {
      leads,
      sources,
      rawText
    };

  } catch (error) {
    console.error("Gemini Search Error:", error);
    throw error;
  }
};