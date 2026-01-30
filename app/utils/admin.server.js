// app/utils/admin.server.js
import { authenticate } from "../shopify.server";

/**
 * Runs Admin GraphQL safely using Shopify's Remix helper.
 * authenticate.admin returns { admin, session } where admin.graphql exists.
 */
export async function adminGql(request, query, variables = {}) {
  const { admin } = await authenticate.admin(request); // requires admin to be logged in
  const res = await admin.graphql(query, { variables });
  const json = await res.json();

  if (json.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(json.errors)}`);
  }

  return json.data;
}