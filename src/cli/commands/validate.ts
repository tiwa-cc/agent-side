import { validateProject } from "../../core/validateProject.js";
import type { LoadProjectOptions } from "../../core/loadProject.js";

export async function validateCommand(entry?: string, options: { config?: string } = {}): Promise<void> {
  const validateOptions: LoadProjectOptions = {};
  if (options.config) validateOptions.configPath = options.config;
  if (entry) validateOptions.entry = entry;

  await validateProject(validateOptions);
  console.log("DocIR is valid");
}
