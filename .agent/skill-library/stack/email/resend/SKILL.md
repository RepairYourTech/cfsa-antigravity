---
name: resend
description: Send transactional and marketing emails with Resend and React Email templates. Use when implementing email sending, domain verification, webhook handling, batch operations, or building email templates in React.
version: 1.0.0
---

# Resend Email

Send transactional and marketing emails using the Resend API with React Email templates. Resend provides a developer-first email API with excellent deliverability and a TypeScript-native SDK.

## When to Use This Skill

- Sending transactional emails (welcome, password reset, receipts)
- Building email templates with React components
- Handling email delivery webhooks (bounces, opens, clicks)
- Sending batch emails to multiple recipients
- Managing email domains and DNS verification

## Setup

```bash
# Install Resend SDK and React Email
pnpm add resend
pnpm add react-email @react-email/components -D
```

### Client Initialization

```typescript
// src/lib/email/client.ts
import { Resend } from 'resend';

if (!process.env.RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY environment variable is required');
}

export const resend = new Resend(process.env.RESEND_API_KEY);
```

## Sending Emails

### Basic Email

```typescript
import { resend } from '@/lib/email/client';

const { data, error } = await resend.emails.send({
  from: 'App <noreply@yourdomain.com>',
  to: ['user@example.com'],
  subject: 'Welcome to our platform',
  html: '<h1>Welcome!</h1><p>Thanks for signing up.</p>',
});

if (error) {
  console.error('Email send failed:', error.message);
  throw new Error(`Failed to send email: ${error.name}`);
}

// data.id contains the email ID for tracking
```

### With React Email Template

```typescript
import { resend } from '@/lib/email/client';
import { WelcomeEmail } from '@/emails/welcome';

const { data, error } = await resend.emails.send({
  from: 'App <noreply@yourdomain.com>',
  to: ['user@example.com'],
  subject: 'Welcome to our platform',
  react: WelcomeEmail({ username: 'John', loginUrl: 'https://app.com/login' }),
});
```

### With Attachments

```typescript
const { data, error } = await resend.emails.send({
  from: 'Billing <billing@yourdomain.com>',
  to: ['user@example.com'],
  subject: 'Your invoice #1234',
  react: InvoiceEmail({ invoiceId: '1234', amount: 49.99 }),
  attachments: [
    {
      filename: 'invoice-1234.pdf',
      content: pdfBuffer, // Buffer or base64 string
    },
  ],
});
```

### With Custom Headers and Reply-To

```typescript
const { data, error } = await resend.emails.send({
  from: 'Support <support@yourdomain.com>',
  to: ['user@example.com'],
  replyTo: 'help@yourdomain.com',
  subject: 'Ticket #567 Update',
  react: TicketUpdateEmail({ ticketId: '567' }),
  headers: {
    'X-Entity-Ref-ID': 'ticket-567',
  },
  tags: [
    { name: 'category', value: 'support' },
    { name: 'ticket_id', value: '567' },
  ],
});
```

## Batch Sending

```typescript
const { data, error } = await resend.batch.send([
  {
    from: 'App <noreply@yourdomain.com>',
    to: ['user1@example.com'],
    subject: 'Your weekly digest',
    react: DigestEmail({ userId: 'u_1' }),
  },
  {
    from: 'App <noreply@yourdomain.com>',
    to: ['user2@example.com'],
    subject: 'Your weekly digest',
    react: DigestEmail({ userId: 'u_2' }),
  },
]);

// data contains array of { id } for each email
```

## React Email Templates

### Template Structure

```
emails/
  components/
    header.tsx
    footer.tsx
    button.tsx
  welcome.tsx
  password-reset.tsx
  invoice.tsx
```

### Building a Template

```tsx
// emails/welcome.tsx
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Button,
  Img,
} from '@react-email/components';

interface WelcomeEmailProps {
  username: string;
  loginUrl: string;
}

export function WelcomeEmail({ username, loginUrl }: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Welcome to our platform, {username}!</Preview>
      <Body style={main}>
        <Container style={container}>
          <Img
            src="https://yourdomain.com/logo.png"
            width={120}
            height={40}
            alt="Logo"
          />
          <Heading style={h1}>Welcome, {username}!</Heading>
          <Text style={text}>
            We are excited to have you on board. Click the button below to get
            started.
          </Text>
          <Section style={buttonContainer}>
            <Button style={button} href={loginUrl}>
              Get Started
            </Button>
          </Section>
          <Text style={footer}>
            If you did not create this account, please ignore this email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = { backgroundColor: '#f6f9fc', fontFamily: 'sans-serif' };
const container = { margin: '0 auto', padding: '40px 20px', maxWidth: '560px' };
const h1 = { color: '#1d1c1d', fontSize: '24px', fontWeight: '700' as const };
const text = { color: '#484848', fontSize: '16px', lineHeight: '24px' };
const buttonContainer = { textAlign: 'center' as const, margin: '24px 0' };
const button = {
  backgroundColor: '#5469d4',
  borderRadius: '4px',
  color: '#fff',
  fontSize: '16px',
  textDecoration: 'none',
  padding: '12px 24px',
  display: 'inline-block',
};
const footer = { color: '#898989', fontSize: '12px' };

// Default export for preview in React Email dev server
export default WelcomeEmail;
```

### Previewing Templates

```bash
# Start React Email dev server for visual preview
npx react-email dev --dir emails --port 3333
```

## Domain Verification

```typescript
// Add a domain
const { data, error } = await resend.domains.create({
  name: 'yourdomain.com',
});

// Returns DNS records to add:
// data.records contains TXT, MX, and DKIM records

// Verify domain after DNS records are set
const { data: verified } = await resend.domains.verify(data.id);

// List domains
const { data: domains } = await resend.domains.list();
```

## Webhooks

### Webhook Events

| Event | Description |
|-------|-------------|
| `email.sent` | Email accepted by Resend |
| `email.delivered` | Email delivered to recipient |
| `email.bounced` | Email bounced |
| `email.complained` | Recipient marked as spam |
| `email.opened` | Recipient opened email |
| `email.clicked` | Recipient clicked a link |
| `email.delivery_delayed` | Delivery temporarily delayed |

### Webhook Handler

```typescript
// src/pages/api/webhooks/resend.ts (Astro example)
import type { APIRoute } from 'astro';
import { Webhook } from 'svix';

const WEBHOOK_SECRET = import.meta.env.RESEND_WEBHOOK_SECRET;

export const POST: APIRoute = async ({ request }) => {
  const body = await request.text();
  const headers = {
    'svix-id': request.headers.get('svix-id') ?? '',
    'svix-timestamp': request.headers.get('svix-timestamp') ?? '',
    'svix-signature': request.headers.get('svix-signature') ?? '',
  };

  const wh = new Webhook(WEBHOOK_SECRET);
  let event: { type: string; data: Record<string, unknown> };

  try {
    event = wh.verify(body, headers) as typeof event;
  } catch {
    return new Response('Invalid signature', { status: 401 });
  }

  switch (event.type) {
    case 'email.bounced':
      await handleBounce(event.data);
      break;
    case 'email.complained':
      await handleComplaint(event.data);
      break;
    case 'email.delivered':
      await handleDelivered(event.data);
      break;
  }

  return new Response('OK', { status: 200 });
};

async function handleBounce(data: Record<string, unknown>) {
  const email = data.to as string[];
  // Mark email as undeliverable in your database
  // Suppress future sends to this address
  await db.emailSuppressions.create({ email: email[0], reason: 'bounce' });
}

async function handleComplaint(data: Record<string, unknown>) {
  const email = data.to as string[];
  // Immediately suppress -- legally required
  await db.emailSuppressions.create({ email: email[0], reason: 'complaint' });
}
```

## Error Handling

```typescript
import { resend } from '@/lib/email/client';

async function sendEmailSafely(params: Parameters<typeof resend.emails.send>[0]) {
  const { data, error } = await resend.emails.send(params);

  if (error) {
    // Resend error types:
    // - validation_error: Invalid parameters
    // - missing_required_field: Required field not provided
    // - rate_limit_exceeded: Too many requests
    // - not_found: Resource not found
    // - internal_server_error: Resend server error
    if (error.name === 'rate_limit_exceeded') {
      // Implement backoff and retry
      await sleep(1000);
      return sendEmailSafely(params);
    }
    throw new Error(`Email failed: ${error.name} - ${error.message}`);
  }

  return data;
}
```

## Testing with Mailpit

For local development, use Mailpit as a catch-all SMTP server:

```bash
# Run Mailpit (catches all outgoing email)
docker run -d --name mailpit -p 8025:8025 -p 1025:1025 axllent/mailpit

# UI at http://localhost:8025
```

```typescript
// src/lib/email/client.ts
import { Resend } from 'resend';
import nodemailer from 'nodemailer';

function createEmailClient() {
  if (process.env.NODE_ENV === 'development') {
    // Use Mailpit in development
    return nodemailer.createTransport({
      host: 'localhost',
      port: 1025,
      secure: false,
    });
  }
  return new Resend(process.env.RESEND_API_KEY!);
}
```

## Anti-Patterns

| Anti-Pattern | Correct Approach |
|-------------|-----------------|
| Sending emails synchronously in request handlers | Queue emails via background jobs (Inngest, etc.) |
| Ignoring bounce/complaint webhooks | Process them immediately -- suppresses prevent reputation damage |
| Hardcoding `from` addresses | Use environment variables for domain config |
| Not verifying webhook signatures | Always verify with Svix -- unsigned webhooks can be spoofed |
| Using `html` strings for complex layouts | Use React Email components for maintainable templates |
| Sending to unverified addresses in production | Resend restricts sending to verified domains only unless on paid plan |

## Rate Limits

| Plan | Limit |
|------|-------|
| Free | 100 emails/day, 1 request/second |
| Pro | 50,000 emails/month, 10 requests/second |

Always implement retry logic with exponential backoff for rate limit errors.
