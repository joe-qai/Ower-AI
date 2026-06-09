import { getBaseUrl, getApiKey, getModelConfig } from './config.js';

export async function callApi(modelType, prompt) {
  const config = getModelConfig(modelType);
  const url = `${getBaseUrl()}${config.endpoint}`;
  const apiKey = getApiKey();

  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  };

  let body = {};

  switch (modelType) {
    case 'text':
      body = {
        model: 'agnes-2.0-flash',
        messages: [
          { role: 'user', content: prompt }
        ],
        max_tokens: 2048,
        temperature: 0.7
      };
      break;
    case 'image':
      body = {
        model: 'agnes-image-2.1-flash',
        prompt: prompt,
        n: 1,
        size: '1024x1024'
      };
      break;
    case 'video':
      body = {
        model: 'agnes-video-v2.0',
        prompt: prompt,
        duration: 10,
        resolution: '1080p'
      };
      break;
    default:
      throw new Error(`Unsupported model type: ${modelType}`);
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} - ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API call error:', error);
    throw error;
  }
}

export function parseResponse(modelType, response) {
  switch (modelType) {
    case 'text':
      return response.choices?.[0]?.message?.content || response.text || 'No response';
    case 'image':
      return response.data?.[0]?.url || response.url || null;
    case 'video':
      return response.data?.[0]?.url || response.url || null;
    default:
      return response;
  }
}