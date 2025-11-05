export async function generateChecklistFromText(text: string): Promise<string[]> {
  try {
    const response = await fetch('/.netlify/functions/generate-checklist', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Error de comunicación con el servidor.' }));
      // Utiliza el mensaje de error de la función serverless, o uno por defecto.
      throw new Error(errorData.error || `Error: ${response.status} ${response.statusText}`);
    }

    const items = await response.json();

    if (Array.isArray(items) && items.every(item => typeof item === 'string')) {
      return items;
    } else {
      throw new Error("El formato de la respuesta del servidor no es válido.");
    }
  } catch (error) {
    console.error("Error al generar la lista de verificación:", error);
    // Propaga un mensaje de error amigable. El error original se registra en la consola.
    if (error instanceof Error) {
        throw new Error(`No se pudo generar la lista. ${error.message}`);
    }
    throw new Error("No se pudo generar la lista debido a un error inesperado.");
  }
}
