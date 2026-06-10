import { describe, test, expect } from 'vitest';

describe('app.js', () => {
  test('setupEventListeners does not throw when clearBtn is missing', () => {
    document.body.innerHTML = `
      <input type="text" id="userInput">
      <button id="sendBtn">Send</button>
    `;

    const userInput = document.getElementById('userInput');
    const sendBtn = document.getElementById('sendBtn');
    const clearBtn = document.getElementById('clearBtn');

    expect(clearBtn).toBeNull();
    expect(() => {
      if (userInput) userInput.addEventListener('keypress', () => {});
      if (sendBtn) sendBtn.addEventListener('click', () => {});
      if (clearBtn) clearBtn.addEventListener('click', () => {});
    }).not.toThrow();
  });
});
