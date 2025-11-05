import { GoogleGenAI, Type } from "@google/genai";
import type { Handler } from "@netlify/functions";

const handler: Handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Método no permitido' }),
    };
  }

  try {
    const { text } = JSON.parse(event.body || '{}');

    if (!text || typeof text !== 'string' || text.trim() === '') {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'El campo de texto es requerido.' }),
      };
    }

    if (!process.env.API_KEY) {
        console.error("La variable de entorno API_KEY no está configurada.");
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Error de configuración del servidor. La clave API no está disponible." }),
        };
    }
    
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
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: jsonString,
    };
  } catch (error) {
    console.error("Error en la función de Netlify:", error);
    const errorMessage = error instanceof Error ? error.message : "Ocurrió un error desconocido.";
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "No se pudo generar la lista.", details: errorMessage }),
    };
  }
};

export { handler };
