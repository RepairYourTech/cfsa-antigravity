---
name: shopify
description: "Expert Shopify development guide covering Liquid templating, Online Store 2.0 theme architecture, Storefront API, Admin API (GraphQL), Shopify CLI, app development (Remix), Polaris UI, webhooks, checkout extensions, Shopify Functions, metafields, cart customization, theme app extensions, Hydrogen, Oxygen hosting, and performance optimization."
version: 1.0.0
---

# Shopify Expert

## 1. Liquid Templating

### Core Syntax

Liquid is Shopify's template language. It has three main constructs: objects, tags, and filters.

```liquid
{%- comment -%} Objects: output dynamic content {%- endcomment -%}
{{ product.title }}
{{ product.price | money }}
{{ shop.name }}

{%- comment -%} Tags: logic and control flow {%- endcomment -%}
{% if product.available %}
  <button type="button">Add to Cart</button>
{% else %}
  <button type="button" disabled>Sold Out</button>
{% endif %}

{%- comment -%} Filters: transform output {%- endcomment -%}
{{ product.title | upcase }}
{{ product.price | money_with_currency }}
{{ 'hero.jpg' | asset_url | image_tag: loading: 'lazy', width: 800 }}
{{ product.description | strip_html | truncate: 150 }}
{{ 'now' | date: '%Y-%m-%d' }}
```

### Whitespace Control

Use `{%-` and `-%}` (with hyphens) to strip surrounding whitespace. This prevents blank lines in rendered HTML.

```liquid
{%- assign greeting = 'Hello' -%}
{%- if customer -%}
  <p>{{ greeting }}, {{ customer.first_name }}</p>
{%- endif -%}
```

### Liquid Objects Reference

```liquid
{%- comment -%} Product {%- endcomment -%}
{{ product.id }}
{{ product.title }}
{{ product.handle }}                     {%- comment -%} URL slug {%- endcomment -%}
{{ product.description }}
{{ product.price | money }}              {%- comment -%} Lowest variant price {%- endcomment -%}
{{ product.compare_at_price | money }}   {%- comment -%} Original price (for sales) {%- endcomment -%}
{{ product.vendor }}
{{ product.type }}
{{ product.tags }}
{{ product.images }}
{{ product.variants }}
{{ product.options }}
{{ product.metafields.custom.warranty }} {%- comment -%} Custom metafield {%- endcomment -%}

{%- comment -%} Variant {%- endcomment -%}
{{ variant.id }}
{{ variant.title }}
{{ variant.price | money }}
{{ variant.sku }}
{{ variant.available }}
{{ variant.inventory_quantity }}

{%- comment -%} Cart {%- endcomment -%}
{{ cart.item_count }}
{{ cart.total_price | money }}
{{ cart.items }}
{{ cart.note }}
{{ cart.attributes }}

{%- comment -%} Customer {%- endcomment -%}
{{ customer.id }}
{{ customer.first_name }}
{{ customer.email }}
{{ customer.orders_count }}
{{ customer.total_spent | money }}
{{ customer.tags }}
```

### Iteration Patterns

```liquid
{%- for product in collection.products limit: 12 -%}
  <div class="product-card">
    <h3>{{ product.title }}</h3>
    <p>{{ product.price | money }}</p>
    {%- if forloop.first -%}
      <span class="badge">First Item</span>
    {%- endif -%}
    {%- if forloop.last -%}
      <span class="badge">Last Item</span>
    {%- endif -%}
    <span>{{ forloop.index }} of {{ forloop.length }}</span>
  </div>
{%- else -%}
  <p>No products found in this collection.</p>
{%- endfor -%}

{%- comment -%} Paginate collections {%- endcomment -%}
{%- paginate collection.products by 24 -%}
  {%- for product in collection.products -%}
    {% render 'product-card', product: product %}
  {%- endfor -%}
  {{ paginate | default_pagination }}
{%- endpaginate -%}
```

---

## 2. Theme Architecture (Online Store 2.0)

### Directory Structure

```
my-theme/
  assets/              # CSS, JS, images, fonts
  config/
    settings_schema.json   # Theme settings definitions
    settings_data.json     # Theme settings values (auto-generated)
  layout/
    theme.liquid           # Main layout wrapper
    password.liquid        # Password page layout
  locales/
    en.default.json        # Translation strings
  sections/                # Reusable, configurable sections
    header.liquid
    footer.liquid
    featured-collection.liquid
    hero-banner.liquid
    rich-text.liquid
  snippets/                # Reusable partials (no settings schema)
    product-card.liquid
    price.liquid
    icon.liquid
  templates/               # Page templates (JSON for OS 2.0)
    index.json
    product.json
    collection.json
    page.json
    blog.json
    article.json
    cart.json
    404.json
    customers/
      login.json
      account.json
      order.json
  blocks/                  # App blocks and theme blocks
```

### JSON Templates (Online Store 2.0)

JSON templates define which sections appear and in what order. Merchants customize them in the theme editor.

```json
{
  "name": "Product",
  "sections": {
    "main": {
      "type": "main-product",
      "settings": {
        "show_vendor": true,
        "show_sku": false
      },
      "blocks": {
        "title": { "type": "title" },
        "price": { "type": "price" },
        "variant_picker": { "type": "variant_picker", "settings": { "picker_type": "button" } },
        "quantity": { "type": "quantity_selector" },
        "buy_buttons": { "type": "buy_buttons", "settings": { "show_dynamic_checkout": true } },
        "description": { "type": "description" }
      },
      "block_order": ["title", "price", "variant_picker", "quantity", "buy_buttons", "description"]
    },
    "recommendations": {
      "type": "product-recommendations",
      "settings": {
        "heading": "You may also like",
        "products_to_show": 4
      }
    }
  },
  "order": ["main", "recommendations"]
}
```

### Section Schema

```liquid
{% comment %} sections/featured-collection.liquid {% endcomment %}

<section class="featured-collection" data-section-id="{{ section.id }}">
  <div class="page-width">
    {%- if section.settings.heading != blank -%}
      <h2>{{ section.settings.heading }}</h2>
    {%- endif -%}

    <div class="grid grid--{{ section.settings.columns }}">
      {%- for product in section.settings.collection.products limit: section.settings.products_to_show -%}
        {% render 'product-card', product: product, show_vendor: section.settings.show_vendor %}
      {%- endfor -%}
    </div>
  </div>
</section>

{% schema %}
{
  "name": "Featured Collection",
  "tag": "section",
  "class": "section-featured-collection",
  "settings": [
    {
      "type": "text",
      "id": "heading",
      "label": "Heading",
      "default": "Featured Collection"
    },
    {
      "type": "collection",
      "id": "collection",
      "label": "Collection"
    },
    {
      "type": "range",
      "id": "products_to_show",
      "min": 2,
      "max": 12,
      "step": 1,
      "default": 4,
      "label": "Products to show"
    },
    {
      "type": "select",
      "id": "columns",
      "label": "Columns",
      "options": [
        { "value": "2", "label": "2" },
        { "value": "3", "label": "3" },
        { "value": "4", "label": "4" }
      ],
      "default": "4"
    },
    {
      "type": "checkbox",
      "id": "show_vendor",
      "label": "Show vendor",
      "default": false
    }
  ],
  "presets": [
    {
      "name": "Featured Collection"
    }
  ]
}
{% endschema %}
```

---

## 3. Storefront API

### GraphQL Queries

The Storefront API is a public-facing read API for headless storefronts. It uses a public access token.

```graphql
# Fetch products
query GetProducts($first: Int!, $after: String) {
  products(first: $first, after: $after) {
    edges {
      cursor
      node {
        id
        title
        handle
        description
        priceRange {
          minVariantPrice {
            amount
            currencyCode
          }
        }
        images(first: 1) {
          edges {
            node {
              url(transform: { maxWidth: 800 })
              altText
            }
          }
        }
        variants(first: 10) {
          edges {
            node {
              id
              title
              price { amount currencyCode }
              availableForSale
              selectedOptions { name value }
            }
          }
        }
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}

# Create a cart
mutation CartCreate($lines: [CartLineInput!]!) {
  cartCreate(input: { lines: $lines }) {
    cart {
      id
      checkoutUrl
      totalQuantity
      cost {
        totalAmount { amount currencyCode }
        subtotalAmount { amount currencyCode }
      }
      lines(first: 50) {
        edges {
          node {
            id
            quantity
            merchandise {
              ... on ProductVariant {
                id
                title
                price { amount currencyCode }
                product { title handle }
              }
            }
          }
        }
      }
    }
    userErrors { field message }
  }
}
```

### TypeScript Client

```typescript
// lib/shopify.ts
const STOREFRONT_API_URL = `https://${process.env.SHOPIFY_STORE_DOMAIN}/api/2024-10/graphql.json`;
const STOREFRONT_TOKEN = process.env.SHOPIFY_STOREFRONT_TOKEN;

export async function storefrontQuery<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    const response = await fetch(STOREFRONT_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Storefront-Access-Token': STOREFRONT_TOKEN,
        },
        body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
        throw new Error('Storefront API error: ' + response.statusText);
    }

    const json = await response.json();
    if (json.errors) {
        throw new Error('GraphQL errors: ' + JSON.stringify(json.errors));
    }

    return json.data as T;
}
```

---

## 4. Admin API (GraphQL)

### Authenticated Queries

The Admin API requires an access token from a Shopify app or custom app.

```graphql
# Fetch orders
query GetOrders($first: Int!) {
  orders(first: $first, sortKey: CREATED_AT, reverse: true) {
    edges {
      node {
        id
        name
        createdAt
        displayFinancialStatus
        displayFulfillmentStatus
        totalPriceSet {
          shopMoney { amount currencyCode }
        }
        customer {
          firstName
          lastName
          email
        }
        lineItems(first: 10) {
          edges {
            node {
              title
              quantity
              variant { sku }
            }
          }
        }
      }
    }
  }
}

# Update product metafield
mutation UpdateProductMetafield($input: ProductInput!) {
  productUpdate(input: $input) {
    product {
      id
      metafields(first: 5) {
        edges {
          node { namespace key value }
        }
      }
    }
    userErrors { field message }
  }
}
```

### Admin API Client

```typescript
// lib/shopify-admin.ts
const ADMIN_API_URL = `https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/2024-10/graphql.json`;
const ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;

export async function adminQuery<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    const response = await fetch(ADMIN_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': ADMIN_TOKEN,
        },
        body: JSON.stringify({ query, variables }),
    });

    const json = await response.json();
    if (json.errors) {
        throw new Error('Admin API errors: ' + JSON.stringify(json.errors));
    }

    return json.data as T;
}
```

---

## 5. Shopify CLI and App Development

### CLI Commands

```bash
# Create a new app
shopify app init

# Start development server with hot reload
shopify app dev

# Generate extensions
shopify app generate extension

# Deploy app
shopify app deploy

# Theme commands
shopify theme dev              # Start local theme development server
shopify theme push             # Push theme to store
shopify theme pull             # Pull theme from store
shopify theme list             # List themes in store
shopify theme package          # Package theme as zip
shopify theme check            # Lint theme with Theme Check
```

### Remix App Template

```typescript
// app/routes/app._index.tsx (Remix app inside Shopify Admin)
import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { Page, Layout, Card, DataTable, Text } from '@shopify/polaris';
import { authenticate } from '../shopify.server';

export async function loader({ request }: LoaderFunctionArgs) {
    const { admin } = await authenticate.admin(request);

    const response = await admin.graphql(`
        query {
            products(first: 10) {
                edges {
                    node {
                        id
                        title
                        status
                        totalInventory
                        priceRangeV2 {
                            minVariantPrice { amount currencyCode }
                        }
                    }
                }
            }
        }
    `);

    const data = await response.json();
    return json({ products: data.data.products.edges.map((e: any) => e.node) });
}

export default function Index() {
    const { products } = useLoaderData<typeof loader>();

    const rows = products.map((product: any) => [
        product.title,
        product.status,
        product.totalInventory,
        `$${product.priceRangeV2.minVariantPrice.amount}`,
    ]);

    return (
        <Page title="Product Dashboard">
            <Layout>
                <Layout.Section>
                    <Card>
                        <DataTable
                            columnContentTypes={['text', 'text', 'numeric', 'numeric']}
                            headings={['Product', 'Status', 'Inventory', 'Price']}
                            rows={rows}
                        />
                    </Card>
                </Layout.Section>
            </Layout>
        </Page>
    );
}
```

---

## 6. Webhooks

### Webhook Registration

```typescript
// Register webhooks in your app configuration
// shopify.app.toml
// [webhooks]
// api_version = "2024-10"
//
// [[webhooks.subscriptions]]
// topics = ["orders/create", "orders/updated"]
// uri = "/webhooks"

// app/webhooks.ts -- Webhook handler
import crypto from 'crypto';

export function verifyWebhookHMAC(body: string, hmacHeader: string, secret: string): boolean {
    const hash = crypto
        .createHmac('sha256', secret)
        .update(body, 'utf8')
        .digest('base64');
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(hmacHeader));
}

// Handle order creation
export async function handleOrderCreate(payload: Record<string, unknown>): Promise<void> {
    const orderId = payload.id;
    const email = payload.email;
    const totalPrice = payload.total_price;
    const lineItems = payload.line_items;

    // Process the order (sync to your system, send notification, etc.)
    console.log(`New order ${orderId}: $${totalPrice}`);
}
```

### Webhook Topics

```
orders/create          -- New order placed
orders/updated         -- Order modified
orders/paid            -- Order payment confirmed
orders/fulfilled       -- Order fully shipped
products/create        -- New product created
products/update        -- Product modified
products/delete        -- Product removed
customers/create       -- New customer account
customers/update       -- Customer info changed
carts/create           -- New cart created
carts/update           -- Cart modified
checkouts/create       -- Checkout initiated
checkouts/update       -- Checkout modified
app/uninstalled        -- App removed from store
shop/update            -- Store settings changed
inventory_levels/update -- Stock level changed
```

---

## 7. Checkout Extensions and Shopify Functions

### Checkout UI Extension

```typescript
// extensions/checkout-ui/src/Checkout.tsx
import {
    reactExtension,
    Banner,
    BlockStack,
    Text,
    useCartLines,
    useTotalAmount,
} from '@shopify/ui-extensions-react/checkout';

export default reactExtension('purchase.checkout.block.render', () => <FreeShippingBanner />);

function FreeShippingBanner() {
    const cartLines = useCartLines();
    const totalAmount = useTotalAmount();
    const freeShippingThreshold = 75.0;
    const remaining = freeShippingThreshold - parseFloat(totalAmount.amount);

    if (remaining <= 0) {
        return (
            <Banner status="success">
                <Text>You qualify for free shipping!</Text>
            </Banner>
        );
    }

    return (
        <Banner status="info">
            <BlockStack>
                <Text>Add ${remaining.toFixed(2)} more for free shipping!</Text>
            </BlockStack>
        </Banner>
    );
}
```

### Shopify Functions (Discount Example)

```rust
// extensions/discount-function/src/main.rs
use shopify_function::prelude::*;
use shopify_function::Result;

#[shopify_function_target(query_path = "src/run.graphql", schema_path = "schema.graphql")]
fn run(input: input::ResponseData) -> Result<output::FunctionRunResult> {
    let mut targets = Vec::new();

    for line in &input.cart.lines {
        if let Some(product_variant) = &line.merchandise.as_variant() {
            if line.quantity >= 3 {
                targets.push(output::Target {
                    product_variant: Some(output::ProductVariantTarget {
                        id: product_variant.id.clone(),
                        quantity: None,
                    }),
                });
            }
        }
    }

    if targets.is_empty() {
        return Ok(output::FunctionRunResult {
            discounts: vec![],
            discount_application_strategy: output::DiscountApplicationStrategy::FIRST,
        });
    }

    Ok(output::FunctionRunResult {
        discounts: vec![output::Discount {
            message: Some("Buy 3+ get 10% off".to_string()),
            targets,
            value: output::Value::Percentage(output::Percentage { value: "10.0".to_string() }),
        }],
        discount_application_strategy: output::DiscountApplicationStrategy::FIRST,
    })
}
```

---

## 8. Metafields

### Defining Metafields

```graphql
# Create a metafield definition (Admin API)
mutation CreateMetafieldDefinition {
  metafieldDefinitionCreate(definition: {
    name: "Warranty Info"
    namespace: "custom"
    key: "warranty"
    type: "single_line_text_field"
    description: "Product warranty information"
    ownerType: PRODUCT
    validations: [
      { name: "min", value: "1" }
      { name: "max", value: "200" }
    ]
    pin: true
  }) {
    createdDefinition { id }
    userErrors { field message }
  }
}
```

### Accessing Metafields in Liquid

```liquid
{%- comment -%} Product metafields {%- endcomment -%}
{{ product.metafields.custom.warranty.value }}
{{ product.metafields.custom.care_instructions.value }}

{%- comment -%} Rich text metafield {%- endcomment -%}
{{ product.metafields.custom.long_description | metafield_tag }}

{%- comment -%} Image metafield {%- endcomment -%}
{%- assign hero = product.metafields.custom.hero_image.value -%}
{%- if hero -%}
  {{ hero | image_url: width: 1200 | image_tag: loading: 'lazy' }}
{%- endif -%}

{%- comment -%} JSON metafield {%- endcomment -%}
{%- assign specs = product.metafields.custom.specifications.value -%}
{%- if specs -%}
  <dl>
    {%- for spec in specs -%}
      <dt>{{ spec.label }}</dt>
      <dd>{{ spec.value }}</dd>
    {%- endfor -%}
  </dl>
{%- endif -%}

{%- comment -%} List of references (e.g. related products) {%- endcomment -%}
{%- for related in product.metafields.custom.related_products.value -%}
  {% render 'product-card', product: related %}
{%- endfor -%}
```

### Metafield Types

```
single_line_text_field    -- Short text
multi_line_text_field     -- Long text (preserves line breaks)
rich_text_field           -- HTML-like rich text
number_integer            -- Whole numbers
number_decimal            -- Decimal numbers
boolean                   -- True/false
date                      -- Date (YYYY-MM-DD)
date_time                 -- Date and time (ISO 8601)
color                     -- Hex color (#RRGGBB)
url                       -- Valid URL
json                      -- Arbitrary JSON
file_reference            -- Uploaded file
product_reference         -- Link to a product
collection_reference      -- Link to a collection
variant_reference         -- Link to a variant
page_reference            -- Link to a page
list.single_line_text_field -- List of text values
list.product_reference    -- List of product links
```

---

## 9. Cart and Checkout Customization

### AJAX Cart API

```javascript
// Add to cart
async function addToCart(variantId, quantity = 1) {
    const response = await fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            items: [{ id: variantId, quantity }],
        }),
    });
    return response.json();
}

// Update cart item
async function updateCartItem(key, quantity) {
    const response = await fetch('/cart/change.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: key, quantity }),
    });
    return response.json();
}

// Get cart state
async function getCart() {
    const response = await fetch('/cart.js');
    return response.json();
}

// Clear cart
async function clearCart() {
    const response = await fetch('/cart/clear.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
    });
    return response.json();
}

// Add cart attributes (order notes, gift wrapping, etc.)
async function updateCartAttributes(attributes) {
    const response = await fetch('/cart/update.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attributes }),
    });
    return response.json();
}
```

### Cart Drawer Section

```liquid
{% comment %} sections/cart-drawer.liquid {% endcomment %}
<div id="cart-drawer" class="cart-drawer" data-section-id="{{ section.id }}">
  <div class="cart-drawer__header">
    <h2>Your Cart ({{ cart.item_count }})</h2>
    <button type="button" class="cart-drawer__close" aria-label="Close cart">X</button>
  </div>

  {%- if cart.item_count > 0 -%}
    <div class="cart-drawer__items">
      {%- for item in cart.items -%}
        <div class="cart-item" data-key="{{ item.key }}">
          <img
            src="{{ item.image | image_url: width: 120 }}"
            alt="{{ item.title | escape }}"
            width="120"
            height="120"
            loading="lazy"
          >
          <div class="cart-item__details">
            <a href="{{ item.url }}">{{ item.product.title }}</a>
            {%- unless item.product.has_only_default_variant -%}
              <p class="cart-item__variant">{{ item.variant.title }}</p>
            {%- endunless -%}
            <p class="cart-item__price">{{ item.final_line_price | money }}</p>
            <div class="cart-item__quantity">
              <button type="button" data-action="decrease">-</button>
              <input type="number" value="{{ item.quantity }}" min="0" max="99" aria-label="Quantity">
              <button type="button" data-action="increase">+</button>
            </div>
          </div>
        </div>
      {%- endfor -%}
    </div>

    <div class="cart-drawer__footer">
      <div class="cart-drawer__subtotal">
        <span>Subtotal</span>
        <span>{{ cart.total_price | money }}</span>
      </div>
      <a href="/checkout" class="button button--primary">Checkout</a>
    </div>
  {%- else -%}
    <p class="cart-drawer__empty">Your cart is empty.</p>
  {%- endif -%}
</div>
```

---

## 10. Hydrogen (React Framework)

### Project Structure

```
hydrogen-store/
  app/
    components/          # Reusable React components
      ProductCard.tsx
      CartDrawer.tsx
      Layout.tsx
    routes/              # File-based routing (Remix)
      ($locale)._index.tsx
      ($locale).products.$handle.tsx
      ($locale).collections.$handle.tsx
      ($locale).cart.tsx
      ($locale).account.tsx
    lib/
      shopify.ts         # Storefront API client
      fragments.ts       # GraphQL fragments
    styles/
      app.css
    root.tsx
    entry.server.tsx
  public/
  hydrogen.config.ts
```

### Hydrogen Component

```typescript
// app/routes/($locale).products.$handle.tsx
import { json, type LoaderFunctionArgs } from '@shopify/remix-oxygen';
import { useLoaderData } from '@remix-run/react';
import { Image, Money, ShopPayButton } from '@shopify/hydrogen';

export async function loader({ params, context }: LoaderFunctionArgs) {
    const { handle } = params;
    const { storefront } = context;

    const { product } = await storefront.query(PRODUCT_QUERY, {
        variables: { handle },
    });

    if (!product) {
        throw new Response('Product not found', { status: 404 });
    }

    return json({ product });
}

export default function ProductPage() {
    const { product } = useLoaderData<typeof loader>();
    const selectedVariant = product.variants.nodes[0];

    return (
        <div className="product-page">
            <div className="product-gallery">
                {product.images.nodes.map((image: any) => (
                    <Image
                        key={image.id}
                        data={image}
                        sizes="(min-width: 768px) 50vw, 100vw"
                        loading="eager"
                    />
                ))}
            </div>
            <div className="product-info">
                <h1>{product.title}</h1>
                <Money data={selectedVariant.price} />
                {product.descriptionHtml && (
                    <div dangerouslySetInnerHTML={{ __html: product.descriptionHtml }} />
                )}
                <ShopPayButton
                    variantIds={[selectedVariant.id]}
                    storeDomain={`${import.meta.env.PUBLIC_STORE_DOMAIN}`}
                />
            </div>
        </div>
    );
}

const PRODUCT_QUERY = `#graphql
    query Product($handle: String!) {
        product(handle: $handle) {
            id
            title
            handle
            descriptionHtml
            images(first: 10) {
                nodes {
                    id
                    url
                    altText
                    width
                    height
                }
            }
            variants(first: 50) {
                nodes {
                    id
                    title
                    availableForSale
                    price { amount currencyCode }
                    compareAtPrice { amount currencyCode }
                    selectedOptions { name value }
                }
            }
        }
    }
`;
```

---

## 11. Theme App Extensions

```liquid
{% comment %} App blocks that merchants can add to any section {% endcomment %}
{% comment %} extensions/theme-app-extension/blocks/product-reviews.liquid {% endcomment %}

<div class="app-reviews" data-product-id="{{ product.id }}">
  {%- if block.settings.show_summary -%}
    <div class="reviews-summary">
      <span class="reviews-rating">{{ product.metafields.myapp.average_rating.value }}</span>
      <span class="reviews-count">({{ product.metafields.myapp.review_count.value }} reviews)</span>
    </div>
  {%- endif -%}

  <div id="reviews-list" data-product-handle="{{ product.handle }}">
    Loading reviews...
  </div>
</div>

<script src="{{ 'reviews-widget.js' | asset_url }}" defer></script>

{% schema %}
{
  "name": "Product Reviews",
  "target": "section",
  "settings": [
    {
      "type": "checkbox",
      "id": "show_summary",
      "label": "Show rating summary",
      "default": true
    },
    {
      "type": "range",
      "id": "reviews_per_page",
      "min": 3,
      "max": 20,
      "step": 1,
      "default": 5,
      "label": "Reviews per page"
    }
  ]
}
{% endschema %}
```

---

## 12. Performance Optimization

### Image Optimization

```liquid
{%- comment -%} Responsive images with srcset {%- endcomment -%}
{{ product.featured_image | image_url: width: 800 | image_tag:
    loading: 'lazy',
    widths: '200,400,600,800',
    sizes: '(min-width: 768px) 50vw, 100vw'
}}

{%- comment -%} Above-the-fold images: eager loading {%- endcomment -%}
{{ product.featured_image | image_url: width: 1200 | image_tag:
    loading: 'eager',
    fetchpriority: 'high',
    widths: '400,600,800,1200'
}}
```

### Script Loading

```liquid
{%- comment -%} Defer non-critical JavaScript {%- endcomment -%}
<script src="{{ 'cart-drawer.js' | asset_url }}" defer></script>

{%- comment -%} Lazy-load third-party scripts {%- endcomment -%}
<script>
  document.addEventListener('DOMContentLoaded', function() {
    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          var script = document.createElement('script');
          script.src = entry.target.dataset.src;
          document.body.appendChild(script);
          observer.unobserve(entry.target);
        }
      });
    });
    document.querySelectorAll('[data-lazy-script]').forEach(function(el) {
      observer.observe(el);
    });
  });
</script>
```

### Liquid Performance

```liquid
{%- comment -%} GOOD: Assign once, use many {%- endcomment -%}
{%- assign featured_image = product.featured_image -%}
{%- if featured_image -%}
  {{ featured_image | image_url: width: 400 | image_tag }}
{%- endif -%}

{%- comment -%} GOOD: Use render instead of include (scoped, faster) {%- endcomment -%}
{% render 'product-card', product: product %}

{%- comment -%} BAD: include shares all variables (slower, harder to debug) {%- endcomment -%}
{% include 'product-card' %}

{%- comment -%} GOOD: Limit collection loops {%- endcomment -%}
{%- for product in collection.products limit: 12 -%}
  ...
{%- endfor -%}
```

---

## 13. Common Anti-Patterns

### Querying in Loops

```liquid
{%- comment -%} BAD: Fetching data inside loops {%- endcomment -%}
{%- for product in collection.products -%}
  {%- assign related = product.metafields.custom.related.value -%}
  {%- for r in related -%}
    {%- comment -%} Each iteration triggers a metafield lookup {%- endcomment -%}
    {{ r.title }}
  {%- endfor -%}
{%- endfor -%}
```

### Hardcoding Store Data

```liquid
{%- comment -%} BAD: Hardcoded currency {%- endcomment -%}
<span>${{ product.price | divided_by: 100.0 }}</span>

{%- comment -%} GOOD: Use money filters (handles multi-currency) {%- endcomment -%}
<span>{{ product.price | money }}</span>
```

### Ignoring Section Rendering API

```javascript
// BAD: Full page reload for section updates
window.location.reload();

// GOOD: Use Section Rendering API for partial updates
async function refreshSection(sectionId) {
    const url = `${window.location.pathname}?sections=${sectionId}`;
    const response = await fetch(url);
    const data = await response.json();
    const container = document.querySelector(`[data-section-id="${sectionId}"]`);
    if (container) {
        container.outerHTML = data[sectionId];
    }
}
```

---

## 14. Critical Reminders

### ALWAYS

- Use JSON templates for Online Store 2.0 compatibility
- Use `render` instead of `include` for snippets (scoped and faster)
- Add `loading="lazy"` to images below the fold
- Use money filters (`| money`) instead of manual price formatting
- Validate webhook HMAC signatures before processing payloads
- Use Storefront API access tokens (not Admin tokens) in client-side code
- Test themes with Theme Check (`shopify theme check`)
- Use metafield definitions for type validation
- Handle pagination for large collections (never assume small datasets)

### NEVER

- Expose Admin API access tokens in client-side JavaScript
- Use `include` when `render` is available (deprecated, slower, leaks scope)
- Hardcode prices, currencies, or store-specific data in templates
- Skip webhook verification (attackers can send fake webhook payloads)
- Use `posts_per_page: -1` equivalents -- always paginate API responses
- Modify the checkout without using Checkout Extensions (violates Shopify rules)
- Rely on `cart.js` responses being synchronous -- always use async/await
- Store customer PII in metafields without understanding Shopify privacy requirements
