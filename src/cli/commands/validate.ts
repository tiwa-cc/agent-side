import { loadConfig } from "../../config/loadConfig.js";
import { loadDoc } from "../../loader/loadDoc.js";

export async function validateCommand(entry?: string, options: { config?: string } = {}): Promise<void> {
  const config = await loadConfig(options.config);
  await loadDoc(entry ?? config.site.entry, config);
  console.log("DocIR is valid");
}
