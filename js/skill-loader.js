const LOAD_MAP = {
  text: ['prompt-patterns.md', 'prompt-optimization.md'],
  image: ['prompt-patterns.md'],
  video: ['prompt-patterns.md'],
};

const PATTERNS_CONTENT = `# Prompt Patterns

## Pattern Selection Guide

| Pattern | Best For | Token Cost | Reliability |
|---------|----------|------------|-------------|
| Zero-shot | Simple, well-defined tasks | Low | Medium |
| Few-shot | Tasks needing format guidance | Medium | High |
| Chain-of-Thought | Reasoning, math, logic | Medium-High | High |
| ReAct | Multi-step tasks with tools | High | Very High |
| Tree-of-Thoughts | Complex problem solving | Very High | Very High |

## Zero-Shot Prompting

**When to use:** Simple classification, extraction, formatting, or generation tasks where the model has strong prior knowledge.

### Basic Structure
Role, task, constraints, input, output_format

### Best Practices
1. Be specific about the task - Avoid ambiguous instructions
2. Specify output format - Tell the model exactly what to return
3. Include constraints - What NOT to do is as important as what to do
4. Use role priming - "You are an expert..." improves quality

## Few-Shot Prompting

**When to use:** Tasks needing specific output format, domain-specific reasoning, or consistent style.

### Basic Structure
Task description, examples (input-output pairs), actual input

### Few-Shot Selection Strategies
| Strategy | Description | Best For |
|----------|-------------|----------|
| Diverse | Cover different cases/categories | Classification, categorization |
| Similar | Match examples to input type | Consistent formatting |
| Increasing complexity | Start simple, build up | Complex reasoning tasks |
| Edge cases | Include boundary cases | Robust handling |

## Chain-of-Thought (CoT) Prompting

**When to use:** Math problems, logical reasoning, multi-step analysis, debugging, planning.

### CoT Variants
| Variant | Technique | Use Case |
|---------|-----------|----------|
| Zero-shot CoT | "Think step by step" | Quick reasoning tasks |
| Manual CoT | Explicit step examples | Complex domain problems |
| Self-consistency | Generate multiple paths, vote | High-stakes decisions |
| Least-to-most | Decompose into subproblems | Complex multi-part problems |

## ReAct Pattern (Reasoning + Acting)

**When to use:** Tasks requiring external tools, information retrieval, or iterative problem solving.

### ReAct Structure
Thought: [Your reasoning about what to do next]
Action: [tool_name(parameters)]
Observation: [Result from the tool]
... (repeat as needed)
Answer: [Final answer]

## Tree-of-Thoughts (ToT)

**When to use:** Complex problems requiring exploration of multiple solution paths, creative problem solving, strategic planning.

### ToT Structure
Generate candidate approaches, evaluate each, select best, execute, verify`;

const OPTIMIZATION_CONTENT = `# Prompt Optimization

## The Optimization Loop
Baseline -> Measure Results -> Diagnose Issues -> Change One -> Repeat

## Diagnostic Framework

### Failure Category Analysis
| Failure Type | Symptoms | Common Causes |
|--------------|----------|---------------|
| Format errors | Wrong structure, missing fields | Unclear format spec, no examples |
| Hallucinations | Made-up facts, wrong answers | Lack of grounding, vague instructions |
| Inconsistency | Same input, different outputs | Ambiguous instructions, high temperature |
| Over-verbosity | Too much explanation | No length constraints, wrong audience |
| Under-performance | Low accuracy across board | Wrong pattern choice, insufficient context |
| Edge case failures | Breaks on unusual inputs | Missing constraint handling |

## Optimization Techniques

### Technique 1: Instruction Refinement
Before: "Summarize this article."
After: Specific length, focus, audience, and constraints.

### Technique 2: Constraint Tightening
Be explicit about output format, deduplication, sorting, and validation rules.

### Technique 3: Example Calibration
Choose few-shot examples that match real-world input distribution.

### Technique 4: Output Scaffolding
Provide a structured output template for the model to fill in.

## Token Optimization

### Token Reduction Strategies
| Strategy | Savings | Risk |
|----------|---------|------|
| Remove redundant instructions | 10-20% | Low |
| Shorten examples | 20-40% | Medium |
| Use abbreviations/symbols | 5-15% | Medium |
| Compress context | 30-50% | High |
| Switch to zero-shot | 40-60% | High |

## Common Optimization Mistakes
| Mistake | Better Approach |
|---------|-----------------|
| Multiple changes at once | One change per iteration |
| Testing on training examples | Hold out validation set |
| Optimizing for edge cases first | Fix common cases first |
| Ignoring latency/cost | Track all metrics |
| No baseline measurement | Always measure first |
| Skipping failure analysis | Diagnose before changing |

## Version Control for Prompts
Track prompt versions with metrics, changes, and rollback plans.`;

const EMBEDDED = {
  'prompt-patterns.md': PATTERNS_CONTENT,
  'prompt-optimization.md': OPTIMIZATION_CONTENT,
};

export class SkillLoader {
  constructor() {
    this._cache = new Map();
  }

  async loadSkill(modelType) {
    if (this._cache.has(modelType)) {
      return this._cache.get(modelType);
    }

    const files = LOAD_MAP[modelType] || LOAD_MAP.text;
    const contents = [];
    for (const file of files) {
      const text = EMBEDDED[file];
      if (text) contents.push(text);
    }

    const raw = contents.join('\n\n');
    const doc = { modelType, raw };
    this._cache.set(modelType, doc);
    return doc;
  }

  async suggestPattern(input, context) {
    return '';
  }
}
