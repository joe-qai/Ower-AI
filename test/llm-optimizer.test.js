import { describe, test, expect, beforeEach } from 'vitest';
import { Optimizer } from '../js/llm-optimizer.js';

describe('Optimizer', () => {
  let optimizer;

  beforeEach(() => {
    optimizer = new Optimizer();
  });

  test('optimizePrompt returns optimized text on success', async () => {
    const mockCallApi = async () => ({
      choices: [{ message: { content: 'Optimized prompt text' } }],
    });
    const mockParseResponse = (type, res) => res.choices[0].message.content;

    const result = await optimizer.optimizePrompt(
      'Hello world',
      [],
      'text',
      mockCallApi,
      mockParseResponse
    );

    expect(result).toBe('Optimized prompt text');
  });

  test('optimizePrompt returns original input on API failure', async () => {
    const mockCallApi = async () => { throw new Error('API error'); };
    const mockParseResponse = (type, res) => res;

    const result = await optimizer.optimizePrompt(
      'Hello world',
      [],
      'text',
      mockCallApi,
      mockParseResponse
    );

    expect(result).toBe('Hello world');
  });

  test('optimizePrompt returns original input on empty response', async () => {
    const mockCallApi = async () => ({ choices: [{ message: { content: '' } }] });
    const mockParseResponse = (type, res) => res.choices[0].message.content;

    const result = await optimizer.optimizePrompt(
      'Hello world',
      [],
      'text',
      mockCallApi,
      mockParseResponse
    );

    expect(result).toBe('Hello world');
  });

  test('optimizePrompt respects 5 second timeout', async () => {
    const mockCallApi = async () => {
      await new Promise(r => setTimeout(r, 7000));
      return { choices: [{ message: { content: 'Late' } }] };
    };
    const mockParseResponse = (type, res) => res.choices[0].message.content;

    const start = Date.now();
    const result = await optimizer.optimizePrompt(
      'Hello world',
      [],
      'text',
      mockCallApi,
      mockParseResponse,
      { timeout: 500 }
    );
    const elapsed = Date.now() - start;

    expect(result).toBe('Hello world');
    expect(elapsed).toBeLessThan(2000);
  });

  test('optimizePrompt includes attachments in the optimization context', async () => {
    let capturedPrompt = '';
    const mockCallApi = async (type, prompt) => {
      capturedPrompt = prompt;
      return { choices: [{ message: { content: 'Optimized' } }] };
    };
    const mockParseResponse = (type, res) => res.choices[0].message.content;

    await optimizer.optimizePrompt(
      'Summarize',
      [{ type: 'text', name: 'doc.md', content: '# Document\nContent here' }],
      'text',
      mockCallApi,
      mockParseResponse
    );

    expect(capturedPrompt).toContain('doc.md');
    expect(capturedPrompt).toContain('# Document');
    expect(capturedPrompt).toContain('Summarize');
  });
});
