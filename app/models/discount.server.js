// app/models/discount.server.js
import { adminGql } from "../utils/admin.server";
import { readAppStore, writeAppStore } from "../utils/appStore.server";

const APP_DISCOUNT_NAMESPACE = process.env.APP_DISCOUNT_NAMESPACE || "$app:matrix-discount";
const APP_DISCOUNT_KEY = process.env.APP_DISCOUNT_KEY || "matrix";

/**
 * 1) ensureDiscount(): create ONE automatic app discount bound to your Function.
 * Uses discountAutomaticAppCreate. Requires write_discounts. :contentReference[oaicite:5]{index=5}
 */
export async function ensureDiscount(request) {
  const store = readAppStore();
  if (store.discountNodeId) return store.discountNodeId;

  const functionId = process.env.SHOPIFY_FUNCTION_ID;
  if (!functionId) {
    throw new Error("Missing SHOPIFY_FUNCTION_ID");
  }

  const TITLE = "Bizspice Discount Matrix";

  // 1️⃣ Check if discount already exists in Shopify
  const query = `
    query {
      discountNodes(first: 50) {
        nodes {
          id
          discount {
            __typename
            ... on DiscountAutomaticApp {
              title
            }
          }
        }
      }
    }
  `;

  const existing = await adminGql(request, query);

  const match = existing.discountNodes.nodes.find(
    n =>
      n.discount?.__typename === "DiscountAutomaticApp" &&
      n.discount.title === TITLE
  );

  if (match) {
    writeAppStore({ ...store, discountNodeId: match.id });
    return match.id;
  }

  // 2️⃣ Create discount ONLY if not found
  const mutation = `
    mutation Create($automaticAppDiscount: DiscountAutomaticAppInput!) {
      discountAutomaticAppCreate(automaticAppDiscount: $automaticAppDiscount) {
        automaticAppDiscount { discountId }
        userErrors { field message }
      }
    }
  `;

  const variables = {
    automaticAppDiscount: {
      title: TITLE,
      functionId,
      combinesWith: {
        productDiscounts: true,
        orderDiscounts: true,
        shippingDiscounts: true,
      },
      startsAt: new Date().toISOString(),
      "discountClasses": ["PRODUCT"]
    },
  };

  const data = await adminGql(request, mutation, variables);

  const errs = data.discountAutomaticAppCreate.userErrors || [];
  if (errs.length) {
    throw new Error(`discountAutomaticAppCreate userErrors: ${JSON.stringify(errs)}`);
  }

  const discountNodeId =
    data.discountAutomaticAppCreate.automaticAppDiscount.discountId;

  writeAppStore({ ...store, discountNodeId });
  return discountNodeId;
}


/**
 * 2) saveMatrix(): store JSON matrix on the discount node as app-owned metafield.
 * Uses metafieldsSet. :contentReference[oaicite:6]{index=6}
 */
export async function saveMatrix(request, matrixObject) {
  const ownerId = await ensureDiscount(request);

  const mutation = `
    mutation SetMatrix($ownerId: ID!, $value: String!) {
      metafieldsSet(metafields: [{
        ownerId: $ownerId
        namespace: "${APP_DISCOUNT_NAMESPACE}"
        key: "${APP_DISCOUNT_KEY}"
        type: "json"
        value: $value
      }]) {
        metafields { id namespace key type value }
        userErrors { field message }
      }
    }
  `;

  const data = await adminGql(request, mutation, {
    ownerId,
    value: JSON.stringify(matrixObject),
  });

  const errs = data.metafieldsSet.userErrors || [];
  if (errs.length) {
    throw new Error(`metafieldsSet userErrors: ${JSON.stringify(errs)}`);
  }

  return { ownerId, metafield: data.metafieldsSet.metafields?.[0] || null };
}

export async function readMatrix(request) {
  const ownerId = await ensureDiscount(request);

  const query = `
    query ReadMatrix($id: ID!) {
      discountNode(id: $id) {
        id
        metafield(namespace: "${APP_DISCOUNT_NAMESPACE}", key: "${APP_DISCOUNT_KEY}") {
          type
          value
        }
      }
    }
  `;

  const data = await adminGql(request, query, { id: ownerId });
  const val = data?.discountNode?.metafield?.value;

  return { ownerId, matrix: val ? JSON.parse(val) : {} };
}

/**
 * 3) setCustomerSegment(): set customer metafield tfx.segment.
 * Uses metafieldsSet. :contentReference[oaicite:7]{index=7}
 */
export async function setCustomerSegment(request, customerId, segment) {
  const mutation = `
    mutation SetCustomerSegment($ownerId: ID!, $value: String!) {
      metafieldsSet(metafields: [{
        ownerId: $ownerId
        namespace: "tfx"
        key: "segment"
        type: "single_line_text_field"
        value: $value
      }]) {
        metafields { id value }
        userErrors { field message }
      }
    }
  `;

  const data = await adminGql(request, mutation, { ownerId: customerId, value: segment });
  const errs = data.metafieldsSet.userErrors || [];
  if (errs.length) throw new Error(JSON.stringify(errs));
  return data.metafieldsSet.metafields?.[0] || null;
}

/**
 * 4) setProductGroup(): set product metafield tfx.discount_group.
 * Uses metafieldsSet. :contentReference[oaicite:8]{index=8}
 */
export async function setProductGroup(request, productId, group) {
  const mutation = `
    mutation SetProductGroup($ownerId: ID!, $value: String!) {
      metafieldsSet(metafields: [{
        ownerId: $ownerId
        namespace: "tfx"
        key: "discount_group"
        type: "single_line_text_field"
        value: $value
      }]) {
        metafields { id value }
        userErrors { field message }
      }
    }
  `;

  const data = await adminGql(request, mutation, { ownerId: productId, value: group });
  const errs = data.metafieldsSet.userErrors || [];
  if (errs.length) throw new Error(JSON.stringify(errs));
  return data.metafieldsSet.metafields?.[0] || null;
}