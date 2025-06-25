# Copy Mode Setup Guide

## Missing Dependencies

The Copy Mode feature requires the following dependencies to be installed:

```bash
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-typography @tiptap/extension-placeholder @tiptap/extension-link
```

or with yarn:

```bash
yarn add @tiptap/react @tiptap/starter-kit @tiptap/extension-typography @tiptap/extension-placeholder @tiptap/extension-link
```

## Database Requirements

Make sure your Supabase database has the following tables:

1. **stores** table with columns:

   - id (uuid, primary key)
   - name (text)
   - clickup_list_id (text)

2. **clickup_tasks** table with columns:
   - id (text, primary key)
   - store_id (uuid, foreign key to stores.id)
   - name (text)
   - description (text) - contains the email content
   - updated_at (timestamp)

## Environment Variables

Ensure your `.env.local` file has the Supabase connection details:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Features Implemented

### Phase 1: Database and Backend Setup ✅

- Created API routes for fetching stores
- Created API routes for fetching and updating clickup tasks
- Proper error handling and validation

### Phase 2: Frontend Route and Page Structure ✅

- Created `/copy-mode` page with authentication
- Updated sidebar navigation to link to Copy Mode

### Phase 3: Copy Mode Interface Components ✅

- Store selector dropdown
- Campaign list with search functionality
- Email editor with rich text capabilities
- Placeholder AI chat interface

## Next Steps

The following phases are ready to be implemented:

- Phase 4: AI Tool for Email Editing
- Phase 5: Real-time Email Modifications
- Phase 6: Save Functionality (basic save is already implemented)
- Phase 7: Enhanced Layout and UI Polish
