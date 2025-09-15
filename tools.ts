import { z } from "zod";
import { tool } from "ai";
import simpleGit from "simple-git";
import * as fs from "node:fs";

const fileChange = z.object({
    rootDir: z.string().min(1).describe("The root directory"),
});

type FileChange = z.infer<typeof fileChange>;

const excludeFiles=["dist", "bun.lock"];

async function getFileChangesInDirectory({ rootDir }: FileChange) {
        /**
         * @param rootDir - The root directory to get the file changes from
         * @returns The file changes in the root directory
         */
    const git = simpleGit(rootDir);
    const summary = await git.diffSummary();
    const diffs: { file: string, diff: string }[] = [];

    for (const file of summary.files) {
        if (excludeFiles.includes(file.file)) continue;
        const diff = await git.diff(["--", file.file]);
        diffs.push({ file: file.file, diff });
    }
    return diffs;

}

export const getFileChangesInDirectoryTool = tool({
    description: "Gets the code changes made in given directory",
    inputSchema: fileChange,
    execute: getFileChangesInDirectory,
});
const commitMessageInput = z.object({
    diffs: z.array(z.object({
        file: z.string().min(1).describe("The file path"),
        diff: z.string().min(1).describe("The diff content"),
    })),
});

type CommitMessageInput = z.infer<typeof commitMessageInput>;

function generateCommitMessage({ diffs }: CommitMessageInput) {
    /**
     * @param diffs - The diffs to generate the commit message from
     * @returns The commit message
     */
    if (diffs.length === 0){
        return { message: "chore: no code changes detected"}
    }
    // Naive summarization: pick type by heuristics
    let messageType = "chore";
    let scope = "";
    const changes: string[] = [];
    for (const { file, diff } of diffs) {
        if (diff.includes("/function|const|class/")) {
            messageType = "feat";
        } else if (file.includes("test")) {
            messageType = "test";
        }else if (diff.includes("/fix|bug/")) {
            messageType = "fix";
        }
        changes.push(file);
    }
    const message = `${messageType}(${scope ? `${scope}:` : ``}): update ${changes.join(", ")}`;
    return { message };
}
// commit message generation tool base of code changed

export const commitMessageTool = tool({
    description: "Generates a commit message based on code changes",
    inputSchema: commitMessageInput,
    execute: generateCommitMessage,
});

// markdown file generation zod schema
const markdownFile = z.object({
    content: z.string().min(1).describe("The markdown file content"),
});
type MarkdownFile = z.infer<typeof markdownFile>;

// create markdown file
export async function createMarkdownFile({ content }: MarkdownFile) {
    /**
     * @param content - The markdown file content
     * @returns The markdown file path
     */
    // Get current directory
    const currentDir = process.cwd();
    // timestamp
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    // Create new markdown file with timestamp
    const markdownFile = fs.createWriteStream(`${currentDir}/code-changes${timestamp}.md`);
    markdownFile.write(content);
    markdownFile.end();
}
// markdown file generation tool
export const markdownFileTool = tool({
    description: "Generates a markdown file for the code changes",
    inputSchema: markdownFile,
    execute: createMarkdownFile,
});
