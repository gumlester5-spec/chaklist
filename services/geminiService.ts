import { GoogleGenAI, Type } from "@google/genai";

export async function generateChecklistFromText(text: string): Promise<string[]> {
  try {
    // Initialize the Gemini client directly with the environment variable.
    // The build process (e.g., on Netlify) must replace `process.env.API_KEY`
    // with the actual key.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
    
    // Provide a more specific error message if the API key is missing or invalid.
    if (error instanceof Error && /API key/i.test(error.message)) {
         throw new Error("Error con la API Key. Asegúrate de que la variable de entorno API_KEY esté configurada correctamente en los ajustes de tu sitio en Netlify y que la clave sea válida.");
    }
    
    // Propagate other errors to be displayed in the UI.
    throw error;
  }
}
