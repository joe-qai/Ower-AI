import { describe, test, expect, beforeEach } from 'vitest';
import { SkillLoader } from '../js/skill-loader.js';

describe('SkillLoader', () => {
  let loader;

  beforeEach(() => {
    loader = new SkillLoader();
  });

  describe('loadSkill', () => {
    test('loadSkill for text returns patterns and optimization content', async () => {
      const result = await loader.loadSkill('text');

      expect(result.modelType).toBe('text');
      expect(result.raw).toContain('Zero-shot');
      expect(result.raw).toContain('Chain-of-Thought');
      expect(result.raw).toContain('Optimization');
    });

    test('loadSkill for image returns only patterns content', async () => {
      const result = await loader.loadSkill('image');

      expect(result.modelType).toBe('image');
      expect(result.raw).toContain('Zero-shot');
      expect(result.raw).toContain('Few-shot');
      expect(result.raw).not.toContain('Optimization');
    });

    test('loadSkill for video returns only patterns content', async () => {
      const result = await loader.loadSkill('video');

      expect(result.modelType).toBe('video');
      expect(result.raw).toContain('Zero-shot');
      expect(result.raw).not.toContain('Optimization');
    });

    test('caches loaded skills and returns same reference', async () => {
      const first = await loader.loadSkill('text');
      const second = await loader.loadSkill('text');

      expect(first).toBe(second);
    });

    test('caches separately for different modelTypes', async () => {
      const textResult = await loader.loadSkill('text');
      const imageResult = await loader.loadSkill('image');

      expect(textResult).not.toBe(imageResult);
      expect(textResult.raw).not.toBe(imageResult.raw);
    });

    test('returns content for unknown model type using text default', async () => {
      const result = await loader.loadSkill('unknown');

      expect(result.modelType).toBe('unknown');
      expect(result.raw).toContain('Zero-shot');
    });
  });

  describe('suggestPattern', () => {
    test('returns a string', async () => {
      const result = await loader.suggestPattern('hello', {});
      expect(typeof result).toBe('string');
    });
  });
});
