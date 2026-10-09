import "dotenv/config";

const getOpenAIAPIResponse = async (message) => {
  try {
    console.log("\n===== USER PROMPT =====");
    console.log(message);

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "HTTP-Referer": "http://localhost:5173",
          "X-Title": "SigmaGPT"
        },
        body: JSON.stringify({
          model: process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini",
          messages: [
            {
              role: "user",
              content: message
            }
          ],
          temperature: 0.7,
          max_tokens: 800
        })
      }
    );

    const data = await response.json();

    console.log("OpenRouter status:", response.status);
    console.dir(data, { depth: null });

    if (!response.ok) {
      return data?.error?.message || data?.error || "OpenRouter request failed.";
    }

    if (!data.choices || data.choices.length === 0) {
      console.log("AI returned empty response");
      return "AI response failed.";
    }

    const aiReply = data.choices[0].message.content;

    console.log("\n===== AI RESPONSE =====");
    console.log(aiReply);

    console.log("\n===== TOKEN USAGE =====");
    console.log(data.usage);

    console.log("=======================\n");

    return aiReply;
  } catch (err) {
    console.error("OpenRouter Error:", err);
    return "Server error while generating response.";
  }
};

export default getOpenAIAPIResponse;