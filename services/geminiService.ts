
import { GoogleGenAI, Type } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

export async function generateChecklistFromText(text: string): Promise<string[]> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Analiza el siguiente texto y extráelo en una lista de tareas o elementos distintos. Devuelve el resultado como un array JSON de strings. No incluyas nada más que el array JSON en tu respuesta. El texto es: "${text}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING,
            description: "Un único elemento o tarea de la lista de verificación.",
          },
        },
      },
    });

    const jsonString = response.text.trim();
    const items = JSON.parse(jsonString);

    if (Array.isArray(items) && items.every(item => typeof item === 'string')) {
      return items;
    } else {
      throw new Error("El formato de la respuesta de la API no es válido.");
    }
  } catch (error) {
    console.error("Error al llamar a la API de Gemini:", error);
    throw new Error("No se pudo generar la lista desde la API.");
  }
}
