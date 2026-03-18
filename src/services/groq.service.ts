import Groq from "groq-sdk";
import config from "../config/env.js";
import logger from "../utils/logger.js";

const groq = new Groq({ apiKey: config.GROQ_API });

const SYSTEM_PROMPT = `You are an AI verifier for a habit commitment app called Commit.
Your job is to analyze an image submitted by a user as proof of completing their daily habit.
Be fair but strict. Only approve if the image clearly shows evidence of the stated habit.
Respond ONLY with JSON: {"approved": true|false, "reason": "brief explanation"}`;

export async function verifyHabitImage(
  imageUrl: string,
  habitTitle: string,
  habitPrompt?: string | null
): Promise<{ approved: boolean; reason: string }> {
  const userPrompt = habitPrompt
    ? `Habit: "${habitTitle}". Specific verification criteria: ${habitPrompt}`
    : `Habit: "${habitTitle}". Verify that this image shows clear evidence of this habit being completed today.`;

  try {
    const completion = await groq.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: userPrompt },
            { type: "image_url", image_url: { url: imageUrl } },
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 150,
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as { approved?: boolean; reason?: string };

    return {
      approved: parsed.approved === true,
      reason: parsed.reason ?? "No reason provided",
    };
  } catch (err) {
    logger.error(`[Groq]: Verification error: ${err}`);
    return { approved: false, reason: `AI verification failed: ${String(err)}` };
  }
}
