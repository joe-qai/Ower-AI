export class PromptBuilder {
  buildOptimizationPrompt(userInput, attachments, skillDoc, modelType) {
    const attachText = attachments.length > 0
      ? attachments.map(a => `[${a.name}]\n${a.content}`).join('\n\n')
      : '';

    const lines = [
      'You are a prompt optimizer. Rewrite the user input into a better version following the rules below.',
      '',
      '## Rules',
      skillDoc.raw,
    ];

    if (attachments.length > 0) {
      lines.push('', '## User Attachments', attachText);
    }

    lines.push(
      '',
      '## User Input',
      userInput,
      '',
      '## Output',
      'Rewrite the user input to be more clear, specific and effective. Output ONLY the rewritten content — no prefixes, no explanations, no markdown formatting around it, no "optimized prompt:" labels.',
    );

    return lines.join('\n');
  }

  selectPattern(taskType, skillDoc) {
    return { name: 'zero-shot', description: 'Simple direct prompt' };
  }
}
