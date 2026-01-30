// app/routes/app.matrix.jsx
import { useLoaderData, useActionData, Form } from "react-router";
import { useState } from "react";
import { Page, Layout, Card, TextField, Button, Banner, BlockStack, Text } from "@shopify/polaris";
import { readMatrix, saveMatrix } from "../models/discount.server";

export async function loader({ request }) {
  const data = await readMatrix(request);
  return ({
    ownerId: data.ownerId,
    matrixText: JSON.stringify(data.matrix || {}, null, 2),
  });
}
export async function action({ request }) {
  const form = await request.formData();
  const matrixText = String(form.get("matrixText") || "{}");

  try {
    const matrix = JSON.parse(matrixText);
    const out = await saveMatrix(request, matrix);
    return ({ ok: true, message: "Matrix saved.", ownerId: out.ownerId });
  } catch (e) {
    return ({ ok: false, error: e.message || String(e) }, { status: 400 });
  }
}

export default function MatrixPage() {
  const { ownerId, matrixText } = useLoaderData();
  const actionData = useActionData();
  const [text, setText] = useState(matrixText);
  return (
    <Page title="Bizspice Discount Matrix">
      <Layout>
        <Layout.Section>
          <Card padding="400">
            <BlockStack gap="300">
              {/* <Text as="p" tone="subdued">
                Discount node: <b>{ownerId}</b>
              </Text> */}

              {actionData?.ok === false && <Banner tone="critical">{actionData.error}</Banner>}
              {actionData?.ok === true && <Banner tone="success">{actionData.message}</Banner>}

              <Form method="post">
              <TextField
                    label="Matrix JSON (Customer -> Product -> Discount Percent)"
                    name="matrixText"
                    value={text}          // ✅ controlled value
                    multiline={18}
                    autoComplete="off"
                    onChange={setText}    // Polaris passes (value) directly
                />
                
                <div style={{ marginTop: 12 }}>
                  <Button variant="primary" submit>
                    Save Matrix
                  </Button>
                </div>
              </Form>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}