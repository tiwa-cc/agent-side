import type { Block, DocIR } from "./types.js";

export function normalizeDoc(doc: DocIR): DocIR {
  return {
    ...doc,
    blocks: doc.blocks.map(normalizeBlock),
  };
}

function normalizeBlock(block: Block): Block {
  if (block.type === "section") {
    return { ...block, blocks: block.blocks.map(normalizeBlock) };
  }
  if ("tone" in block && block.tone === undefined) {
    return { ...block, tone: "neutral" } as Block;
  }
  return block;
}
