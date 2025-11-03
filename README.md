# Ringba After-Hours Tracker

Track after-hours calls and callback rates across Ringba call centers with real-time analytics dashboard.

## Features

- 📊 Real-time after-hours call tracking
- 📞 Callback rate monitoring (48-hour window)
- 🏢 30 call center configurations
- 🔐 Secure authentication with Supabase
- 📅 Multiple date range filters (7, 30, 90, 365 days, All Time)
- 🎨 Clean white UI with gradient accents

## Tech Stack

- **Frontend**: Next.js 15, React, TypeScript
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **UI**: Tailwind CSS, Shadcn UI
- **Icons**: Lucide React

## Getting Started

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

## Database Setup

Run the migrations in the `supabase/migrations` folder in order:
1. `20241104000001_create_calls_table.sql`
2. `20241104000002_create_analytics_view.sql`
3. `20241104000003_create_callback_analytics.sql`
4. `20241104000004_create_helper_functions.sql`
5. `20241104000005_enable_rls.sql`

## License

MIT

