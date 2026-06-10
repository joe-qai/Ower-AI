import { SkillLoader } from './skill-loader.js';
import { PromptBuilder } from './prompt-builder.js';

export class Optimizer {
  constructor() {
    this._skillLoader = new SkillLoader();
    this._promptBuilder = new PromptBuilder();
  }

  async optimizePrompt(userInput, attachments, modelType, callApi, parseResponse, options = {}) {
    const timeout = options.timeout || 5000;

    try {
      const skillDoc = await this._skillLoader.loadSkill(modelType);

      const optimizationPrompt = this._promptBuilder.buildOptimizationPrompt(
        userInput, attachments, skillDoc, modelType
      );

      const response = await this._withTimeout(
        callApi('text', optimizationPrompt),
        timeout
      );

      const optimized = parseResponse('text', response);
      if (optimized && optimized.trim()) {
        return optimized;
      }
    } catch {
      // Fall through to return original
    }

    return userInput;
  }

  _withTimeout(promise, ms) {
    return Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms)),
    ]);
  }
}
