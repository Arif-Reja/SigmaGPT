import "dotenv/config";

const getSystemPrompt = (mode, socraticMode) => {
  const prompts = {
    learn: `
You are SigmaGPT Learn Mode, a personal AI tutor.

- Explain concepts in simple, beginner-friendly language.
- Start with intuition, then explain the logic step by step.
- Use practical examples and Java examples when relevant.
- Explain time and space complexity for coding problems.
- Help the user understand why a solution works, not just memorize it.
`,

    practice: `
You are SigmaGPT Practice Mode, a problem-solving coach.

- Encourage the user to solve problems independently.
- Start with a useful hint instead of immediately revealing the complete solution.
- Provide progressive hints when the user is stuck.
- Analyze the user's attempted approach and identify mistakes.
- Explain the optimal approach, edge cases, and complexity when appropriate.
- If the user explicitly asks for the complete solution, provide it.
`,

    interview: `
You are SigmaGPT Interview Mode, a technical interviewer.

- Ask one interview question at a time.
- Wait for the user's answer before asking the next question.
- Evaluate answers for correctness, clarity, and completeness.
- Explain missing concepts and suggest a stronger interview-ready answer.
- Ask relevant follow-up questions based on the user's response.
- Cover Java, OOP, DSA, DBMS, SQL, OS, Computer Networks, and backend development.
- When asked to conduct a mock interview, begin with an appropriate question.
`,

    developer: `
You are SigmaGPT Developer Mode, a practical software development assistant.

- Help build, debug, review, and improve software.
- Identify the likely root cause before suggesting a fix.
- Provide corrected code and explain important changes.
- Prefer maintainable, secure, and efficient solutions.
- Respect the user's existing code, framework, and architecture.
- Ask for missing error messages or relevant code when necessary.
- Never claim code was executed or tested unless it actually was.
`
  };

  const selectedPrompt = prompts[mode] || prompts.learn;

  if (socraticMode) {
    return `${selectedPrompt}

SOCRATIC MODE IS ENABLED:
- Guide the user through questions rather than immediately giving away answers.
- Ask one clear, relevant guiding question at a time.
- Use small hints to help the user discover the solution.
- Adapt your questions to the user's previous answers.
- Do not reveal the complete answer immediately.
- If the user explicitly requests the full solution, or repeated guidance is not helping, provide a clear explanation.
`;
  }

  return selectedPrompt;
};

const MODEL = process.env.OPENROUTER_MODEL || "openai/gpt-4o";
const MAX_TOKENS = Number(process.env.OPENROUTER_MAX_TOKENS) || 2000;
const REQUEST_TIMEOUT_MS = 60000;
const STREAM_IDLE_TIMEOUT_MS = 60000;
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export class AIError extends Error {
  constructor(message, { status = null, userMessage = null } = {}) {
    super(message);
    this.name = "AIError";
    this.status = status;
    this.userMessage = userMessage;
  }
}

const friendlyMessage = (status) => {
  if (status === 401) {
    return "The OpenRouter API key is invalid or missing. Check OPENROUTER_API_KEY in Backend/.env.";
  }

  if (status === 402) {
    return "Not enough OpenRouter credits for this request. Add credits at openrouter.ai/credits, or lower OPENROUTER_MAX_TOKENS in Backend/.env.";
  }

  if (status === 403) {
    return "The AI request was blocked. Check your OpenRouter key and access to this model.";
  }

  if (status === 404) {
    return "The AI model was not found. Check OPENROUTER_MODEL in Backend/.env.";
  }

  if (status === 408) {
    return "The AI service took too long to respond. Please try again.";
  }

  if (status === 429) {
    return "The AI service is busy or rate limited. Wait a moment and try again.";
  }

  if (status >= 500) {
    return "The AI provider is having problems right now. Please try again in a moment.";
  }

  return null;
};

const toAIError = (err) => {
  if (err instanceof AIError) {
    return err;
  }

  const code = err.cause?.code || err.code || "";

  console.error(
    "Could not reach OpenRouter:",
    err.message,
    code ? `(${code})` : ""
  );

  return new AIError(err.message, {
    userMessage:
      "Cannot reach OpenRouter from the server. Check your internet connection, turn off any VPN or antivirus HTTPS scanning, and try again."
  });
};

const assertApiKey = () => {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new AIError("OPENROUTER_API_KEY is missing in the .env file", {
      userMessage:
        "The OpenRouter API key is missing. Add OPENROUTER_API_KEY to Backend/.env."
    });
  }
};

   const buildRequestOptions = ({
     messages,
     mode,
     socraticMode,
     contextPrompt = "",
     stream,
     signal
   }) => ({
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`
  },
  body: JSON.stringify({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    stream,
    messages: [
              {
           role: "system",
           content: contextPrompt
             ? `${getSystemPrompt(mode, socraticMode)}\n\n${contextPrompt}`
             : getSystemPrompt(mode, socraticMode)
         },
      ...messages
    ]
  }),
  signal
});

const buildHttpError = async (response) => {
  let data = {};

  try {
    data = await response.json();
  } catch (parseErr) {
    data = {};
  }

  console.error(
    `OpenRouter API error (status ${response.status}):`,
    JSON.stringify(data)
  );

  return new AIError(
    data.error?.message || `OpenRouter request failed (status ${response.status})`,
    {
      status: response.status,
      userMessage: friendlyMessage(response.status)
    }
  );
};

const getOpenAIAPIResponse = async ({
  messages,
  mode = "learn",
  socraticMode = false
}) => {
  assertApiKey();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(
      OPENROUTER_URL,
      buildRequestOptions({
        messages,
        mode,
        socraticMode,
        stream: false,
        signal: controller.signal
      })
    );

    if (!response.ok) {
      throw await buildHttpError(response);
    }

    let data;

    try {
      data = await response.json();
    } catch (parseErr) {
      throw new AIError(
        `OpenRouter returned an invalid response (status ${response.status})`
      );
    }

    const choice = data.choices?.[0];
    const assistantReply = choice?.message?.content;

    if (!assistantReply) {
      throw new AIError("The AI returned an empty response");
    }

    if (choice.finish_reason === "length") {
      console.warn(
        `Reply was cut off at ${MAX_TOKENS} tokens. Increase OPENROUTER_MAX_TOKENS if this happens often.`
      );
    }

    return assistantReply;
  } catch (err) {
    if (err.name === "AbortError") {
      console.error("AI response error: request timed out");

      throw new AIError("The AI service took too long to respond", {
        status: 408,
        userMessage: friendlyMessage(408)
      });
    }

    throw toAIError(err);
  } finally {
    clearTimeout(timeout);
  }
};

export const streamOpenAIAPIResponse = async ({
  messages,
  mode = "learn",
  socraticMode = false,
  contextPrompt = "",
  signal,
  onToken
}) => {
  assertApiKey();

  const controller = new AbortController();
  const abortFromCaller = () => controller.abort();

  if (signal) {
    if (signal.aborted) {
      controller.abort();
    } else {
      signal.addEventListener("abort", abortFromCaller, { once: true });
    }
  }

  let timedOut = false;
  let idleTimer;

  const resetIdleTimer = () => {
    clearTimeout(idleTimer);

    idleTimer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, STREAM_IDLE_TIMEOUT_MS);
  };

  resetIdleTimer();

  try {
    const response = await fetch(
      OPENROUTER_URL,
      buildRequestOptions({
        messages,
        mode,
        socraticMode,
        contextPrompt,
        stream: true,
        signal: controller.signal
      })
    );

    if (!response.ok) {
      throw await buildHttpError(response);
    }

    if (!response.body) {
      throw new AIError("OpenRouter returned no response body");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let buffer = "";
    let text = "";
    let finishReason = null;

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      resetIdleTimer();

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop();

      for (const rawLine of lines) {
        const line = rawLine.trim();

        if (!line.startsWith("data:")) {
          continue;
        }

        const payload = line.slice(5).trim();

        if (payload === "[DONE]") {
          continue;
        }

        let chunk;

        try {
          chunk = JSON.parse(payload);
        } catch (parseErr) {
          continue;
        }

        if (chunk.error) {
          console.error("OpenRouter stream error:", JSON.stringify(chunk.error));

          throw new AIError(chunk.error.message || "The AI stream failed", {
            status: Number(chunk.error.code) || null,
            userMessage: friendlyMessage(Number(chunk.error.code))
          });
        }

        const choice = chunk.choices?.[0];
        const token = choice?.delta?.content;

        if (token) {
          text += token;
          onToken?.(token);
        }

        if (choice?.finish_reason) {
          finishReason = choice.finish_reason;
        }
      }
    }

    if (finishReason === "length") {
      console.warn(
        `Reply was cut off at ${MAX_TOKENS} tokens. Increase OPENROUTER_MAX_TOKENS if this happens often.`
      );
    }

    return { text, finishReason };
  } catch (err) {
    if (err.name === "AbortError") {
      if (timedOut) {
        throw new AIError("The AI service took too long to respond", {
          status: 408,
          userMessage: friendlyMessage(408)
        });
      }

      throw err;
    }

    throw toAIError(err);
  } finally {
    clearTimeout(idleTimer);
    signal?.removeEventListener("abort", abortFromCaller);
  }
};

export default getOpenAIAPIResponse;