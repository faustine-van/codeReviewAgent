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
};
const user_prompt =
  "Review the code changes in `../my-agent’ directory, make your reviews and suggestions file by file. Generate a commit message for the code changes. Generate a markdown file for the code changes";

await codeReviewAgent(user_prompt);
