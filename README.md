# RIO - AI-Powered Marketing Strategy Assistant

<div align="center">
  <img src="public/rio-transparent.png" alt="Rio AI Assistant" width="128" height="128">
  <h3>Meet Rio, your AI-powered marketing analytics assistant</h3>
</div>

## Overview

RIO is a comprehensive AI-powered marketing strategy platform that helps optimize email marketing campaigns, analyze performance data, and streamline marketing workflows. The platform integrates with popular marketing tools like ClickUp, Klaviyo, and Shopify to provide actionable insights and automated campaign management.

## Key Features

### 🤖 Rio AI Assistant

- **Intelligent Analytics**: Query your marketing data in natural language
- **Campaign Optimization**: Get AI-powered recommendations for improving email performance
- **A/B Testing Suggestions**: Receive data-driven test recommendations with current metrics
- **Multi-modal Analysis**: Analyze campaign images and visual content
- **Chart Generation**: Automatically create visualizations from your data

### ✉️ Copy Mode - Email Campaign Editor

- **Rich Text Editor**: Professional email editing with TipTap editor
- **Version Control**: Track changes and revert to previous versions
- **AI-Powered Editing**: Get suggestions and improvements from Rio
- **ClickUp Integration**: Sync campaigns directly with your project management
- **Campaign Management**: Browse and edit campaigns by store/client

### 📊 Data Analytics & Visualization

- **Real-time Metrics**: Monitor campaign performance across platforms
- **Custom Charts**: Generate visualizations using Vega-Lite
- **Database Querying**: Direct access to marketing data through natural language
- **Performance Tracking**: Monitor opens, clicks, conversions, and revenue

### 🔗 Platform Integrations

- **ClickUp**: Task management and campaign tracking
- **Klaviyo**: Email marketing data and flow analysis
- **Shopify**: E-commerce data and order tracking
- **Supabase**: Database and authentication

### 📈 Campaign Management

- **CSV Upload**: Bulk upload campaign calendars
- **Campaign Scheduling**: Manage dates and timing
- **Custom Fields**: Track campaign types, goals, and segments
- **Automated Workflows**: Sync campaigns across platforms

## Tech Stack

- **Frontend**: Next.js 15 with App Router, React 19, TypeScript
- **Styling**: TailwindCSS 4.0, Framer Motion for animations
- **AI**: Anthropic Claude 4, multiple AI provider support
- **Database**: Supabase (PostgreSQL) with Row Level Security
- **Authentication**: Supabase Auth
- **Editor**: TipTap rich text editor
- **Charts**: Vega-Lite for data visualization
- **File Storage**: Vercel Blob for uploads
- **Runtime**: Bun for package management

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- Supabase account
- API keys for integrated services (ClickUp, Klaviyo, Shopify)

### Installation

1. Clone the repository:

```bash
git clone https://github.com/your-username/retentio.git
cd retentio
```

2. Install dependencies:

```bash
bun install
```

3. Set up environment variables:

```bash
cp .env.example .env.local
```

Configure the following variables in `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# AI Providers
ANTHROPIC_API_KEY=your_anthropic_key
OPENAI_API_KEY=your_openai_key
GOOGLE_GENERATIVE_AI_API_KEY=your_google_key

# ClickUp Integration
CLICKUP_KEY=your_clickup_api_key
CLICKUP_LIST_ID_[STORE_NAME]=your_list_id_for_store

# Custom Fields (ClickUp)
CLICKUP_FIELD_CAMPAIGN_TYPE=field_id
CLICKUP_FIELD_PROMO=field_id
CLICKUP_FIELD_PRIMARY_GOAL=field_id
# ... other custom fields

# Klaviyo Integration
KLAVIYO_API_KEY=your_klaviyo_key

# Shopify Integration
SHOPIFY_API_KEY=your_shopify_key
SHOPIFY_API_SECRET=your_shopify_secret
```

4. Set up the database:

```bash
# Start Supabase locally (optional)
npx supabase start

# Run database migrations
npx supabase db push
```

5. Start the development server:

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Usage

### Getting Started with Rio

1. **Authentication**: Sign up or log in to access the platform
2. **Chat Interface**: Start asking Rio questions about your marketing data
3. **Copy Mode**: Edit email campaigns with AI assistance
4. **Campaign Upload**: Upload CSV files to create campaigns in ClickUp

### Common Use Cases

#### Analyzing Campaign Performance

```
"Show me the top performing campaigns this month"
"What's the average open rate for promotional emails?"
"Create a chart showing revenue by campaign type"
```

#### Getting Optimization Suggestions

```
"Suggest A/B tests for my abandoned cart flow"
"How can I improve the CTR on my welcome series?"
"What subject lines work best for product launches?"
```

#### Campaign Management

```
"Upload my Q1 campaign calendar"
"Edit the Mother's Day campaign copy"
"Mark the Valentine's campaign as ready for design"
```

### Tools

- Database querying tool for analytics
- Chart generation tool for visualizations
- Image analysis tool for campaign assets

## AI Tools & Capabilities

### Database Tool

- Natural language database querying
- Automatic SQL generation and execution
- Support for complex analytics queries

### Chart Tool

- Vega-Lite chart generation
- Multiple chart types (bar, line, pie, scatter)
- Interactive visualizations

### Image Analysis Tool

- Campaign image analysis
- Visual content insights
- Multi-modal AI understanding

### Email Edit Tool

- Structured HTML email editing
- Content suggestions and improvements
- Version control and history

## Environment Setup

### Development

```bash
bun dev          # Start development server
bun build        # Build for production
bun start        # Start production server
bun lint         # Run ESLint
```

### Database

```bash
npx supabase start           # Start local Supabase
npx supabase db push         # Push schema changes
npx supabase functions serve # Start edge functions locally
```

## License

This project is proprietary software. All rights reserved.

## Support

For support and questions:

- Create an issue on GitHub
- Contact the development team
- Check the documentation

---

<div align="center">
  <p>Built with ❤️ by the Retentio team</p>
</div>
