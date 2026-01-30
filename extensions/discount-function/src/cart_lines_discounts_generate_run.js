import {
  DiscountClass,
  OrderDiscountSelectionStrategy,
  ProductDiscountSelectionStrategy,
} from '../generated/api';


/**
  * @typedef {import("../generated/api").CartInput} RunInput
  * @typedef {import("../generated/api").CartLinesDiscountsGenerateRunResult} CartLinesDiscountsGenerateRunResult
  */

/**
  * @param {RunInput} input
  * @returns {CartLinesDiscountsGenerateRunResult}
  */

export function cartLinesDiscountsGenerateRun(input) {
  const segmentRaw = input?.cart?.buyerIdentity?.customer?.metafield?.value || "";
   const segment = normalizeKey(segmentRaw);

  if (!segment) return { operations: [] };

  const matrixRaw = input?.discount?.metafield?.value || "";
  let matrix;
  try {
    matrix = JSON.parse(matrixRaw);
  } catch {
    return { operations: [] };
  }

  const normalizedMatrix = {};
  for (const [key, value] of Object.entries(matrix)) {
    normalizedMatrix[normalizeKey(key)] = value;
  }

  const segmentMap = normalizedMatrix[segment];

  if (!segmentMap || typeof segmentMap !== "object") return { operations: [] };

  const candidates = [];
  const lines = input?.cart?.lines || [];

  for (const line of lines) {
    if (line?.merchandise?.__typename !== "ProductVariant") continue;
    //  const groupRaw = line?.merchandise?.product?.metafield?.value || "";
    //  const group = String(groupRaw).trim().toUpperCase();
    const groupRaw = line?.merchandise?.product?.productType || "";
    const group = String(groupRaw).trim();
    if (!group) continue;

    const pct = Number(segmentMap[group]);
    if (!Number.isFinite(pct) || pct <= 0) continue;

    candidates.push({
      message: `${group} - ${pct}% OFF`,
      targets: [{ cartLine: { id: line.id } }],
      value: { percentage: { value: pct } },
    });
  }

  if (!candidates.length) return { operations: [] };

  return {
    operations: [
      {
        productDiscountsAdd: {
          candidates,
          selectionStrategy: ProductDiscountSelectionStrategy.All,
        },
      },
    ],
  };
}

function normalizeKey(value = "") {
  return String(value)
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_\-]/g, "");
}