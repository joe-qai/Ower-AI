let config = null;

export async function loadConfig() {
  try {
    const response = await fetch('config.json');
    if (!response.ok) {
      throw new Error(`Failed to load config: ${response.status}`);
    }
    config = await response.json();
    return config;
  } catch (error) {
    console.error('Error loading config:', error);
    throw error;
  }
}

export function getConfig() {
  if (!config) {
    throw new Error('Config not loaded. Call loadConfig() first.');
  }
  return config;
}

export function getBaseUrl() {
  return getConfig().base_url;
}

export function getApiKey() {
  return getConfig().api_key;
}

export function getModelConfig(modelType) {
  const models = getConfig().models;
  if (!models[modelType]) {
    throw new Error(`Unknown model type: ${modelType}`);
  }
  return models[modelType];
}

export function getOutputDirs() {
  return getConfig().output_dirs;
}