import { google } from "@ai-sdk/google";
import { stepCountIs, streamText } from "ai";
import { SYSTEM_PROMPT } from "./prompts";
import {
  getFileChangesInDirectoryTool,
  commitMessageTool,
  markdownFileTool,
} from "./tools";

const codeReviewAgent = async (prompt: string) => {
  /**
   * @param prompt - The prompt to use for the code review agent
   * @returns The result of the code review agent
   */
  const result = await streamText({
    model: google("models/gemini-2.5-flash"),
    system: SYSTEM_PROMPT,
    tools: {
      getFileChangesInDirectoryTool: getFileChangesInDirectoryTool,
      commitMessageTool: commitMessageTool,
      markdownFileTool: markdownFileTool,
    },
    prompt,
    stopWhen: stepCountIs(10),
  });
  for await (const chunk of result.textStream) {
    process.stdout.write(chunk);
  }
  // 2️⃣ Capture tool results (commit message, markdown file, etc.)
  for await (const event of result.fullStream) {
    if (event.type === "tool-result" && event.toolName === "commitMessageTool") {
        // Cast output to the expected shape
        const output = event.output as { message: string };
        // The output of the tool is in event.output
        console.log("\n\n=== Commit Message ===");
        console.log(output.message);
    }
}

};
const user_prompt =
  "Review the code changes in `../my-agent’ directory, Review my code and generate a commit message";

await codeReviewAgent(user_prompt);
