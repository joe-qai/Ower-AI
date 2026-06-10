import { describe, test, expect } from 'vitest';
import { PromptBuilder } from '../js/prompt-builder.js';

describe('PromptBuilder', () => {
  const builder = new PromptBuilder();

  describe('buildOptimizationPrompt', () => {
    test('includes user input and rules in the prompt', () => {
      const result = builder.buildOptimizationPrompt(
        'Hello world',
        [],
        { modelType: 'text', raw: 'Be concise' },
        'text'
      );

      expect(result).toContain('Hello world');
      expect(result).toContain('Be concise');
      expect(result).toContain('## Output');
      expect(result).toContain('## Rules');
    });

    test('includes attachment content when present', () => {
      const attachments = [
        { type: 'text', name: 'doc.md', content: '# Markdown\nContent' },
      ];

      const result = builder.buildOptimizationPrompt(
        'Summarize this',
        attachments,
        { modelType: 'text', raw: 'Summarize well' },
        'text'
      );

      expect(result).toContain('doc.md');
      expect(result).toContain('# Markdown');
      expect(result).toContain('## User Attachments');
    });

    test('omits attachments section when no attachments', () => {
      const result = builder.buildOptimizationPrompt(
        'Hello',
        [],
        { modelType: 'text', raw: '## Rules' },
        'text'
      );

      expect(result).not.toContain('## User Attachments');
    });

    test('tells LLM to output only the rewritten content', () => {
      const result = builder.buildOptimizationPrompt(
        'Hello',
        [],
        { modelType: 'text', raw: 'Rules' },
        'text'
      );

      expect(result).toContain('Output ONLY');
      expect(result).toContain('no prefixes');
    });
  });

  describe('selectPattern', () => {
    test('returns a pattern config object with name and description', () => {
      const result = builder.selectPattern('reasoning', {
        modelType: 'text',
        raw: '# Prompt Patterns\n## CoT\nChain of thought for reasoning',
      });

      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('description');
    });
  });
});
