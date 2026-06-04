# CloudGuard Autopilot

Autonomous multi-cloud cybersecurity platform designed for SMEs. CloudGuard Autopilot automatically discovers infrastructure assets, analyzes complex attack paths, predicts potential data breaches, and auto-remediates security risks across AWS, Azure, and GCP.

## Key Features

- **Multi-Cloud Discovery**: Automatically indexes IAM users, roles, policies, VPCs, subnets, S3/Blob storage, RDS, EKS, and Load Balancers.
- **Attack Path Analysis**: Maps dependencies and potential lateral movement vectors.
- **Security Copilot**: AI-powered conversational cybersecurity advisor to explain risks and prioritize remediation steps.
- **Compliance Mapping**: Tracks security posture against regulations (e.g., DPDPA, IT Act, RBI guidelines).
- **Auto-Autopilot Engine**: Generates recommended remediation plans with rollback configurations.

## Architecture

This project is built using a modern React frontend and a Supabase backend:

- **Frontend**: Vite, React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Supabase Database (PostgreSQL), Edge Functions (Deno), Row Level Security (RLS)

---

## Local Development Setup

To run the frontend dashboard locally:

### Prerequisites

Ensure you have [Node.js](https://nodejs.org/) installed (version 18+ is recommended).

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```
   Open `http://localhost:8080` in your browser.

---

## Supabase Edge Functions Configuration

The Security Copilot function requires an LLM API key.

1. Install the Supabase CLI.
2. Link your project:
   ```bash
   supabase link --project-ref your-supabase-project-id
   ```
3. Set your preferred API key (Gemini or OpenAI) in the Edge Function secrets:
   ```bash
   # Option A: Set Google Gemini Key (Recommended)
   supabase secrets set GEMINI_API_KEY=your_gemini_api_key

   # Option B: Set OpenAI Key
   supabase secrets set OPENAI_API_KEY=your_openai_api_key
   ```
4. Deploy the functions:
   ```bash
   supabase functions deploy security-copilot
   ```

---

## Security Best Practices

- **Never Commit Secrets**: Ensure all secret keys and `.env` files are kept out of version control. The project is pre-configured to ignore `.env` files.
- **Row Level Security (RLS)**: PostgreSQL tables are protected using Supabase Row Level Security. All user data access is segmented at the organization level.
- **Static Scans**: A GitHub Actions workflow `.github/workflows/security-scan.yml` is configured to run code linting and dependency vulnerability audits on pull requests.
