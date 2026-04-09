# Development Plan

## Project Context
This is a class project forked from the personal Groovy music discovery app. The goal is to add significant features to demonstrate full-stack development skills.

## Primary Goal: Analytics Dashboard + AI Playlist Generator

### Phase 1: Personal Analytics Dashboard (Priority)
**Goal:** Build a comprehensive analytics system showing user listening habits

**Features to Implement:**
1. **Top Artists/Tracks Page**
   - Most played tracks (based on listening history)
   - Most saved artists
   - Play count tracking

2. **Genre Distribution Visualizations**
   - Pie chart of genre preferences
   - Bar chart of listening time by genre
   - Genre exploration progress

3. **Listening Timeline**
   - Line chart showing activity over time
   - Weekly/monthly listening patterns
   - Streak tracking

4. **Listening Patterns Heatmap**
   - Time of day listening habits
   - Day of week patterns
   - Peak listening hours

5. **Music Taste Profile**
   - Personality summary based on preferences
   - "Year in Review" style recap
   - Discovery metrics (new artists/genres explored)

**Technical Implementation:**
- MongoDB aggregation pipelines for statistics
- New collections: `listening_history`, `play_events`
- Chart.js or Recharts for visualizations
- New API routes: `/api/analytics/*`
- New page: `/analytics` or `/stats`

### Phase 2: AI Playlist Generator (Secondary)
**Goal:** Natural language playlist creation

**Features:**
- Text input for playlist description
- OpenAI API integration for intent parsing
- Smart track matching based on parsed criteria
- Save generated playlists to user account

**Technical Implementation:**
- OpenAI API integration
- New API route: `/api/playlists/generate`
- Playlist model in MongoDB
- UI for playlist input and display

## Why These Features?
- **Visual Impact:** Charts and graphs look impressive for demos
- **Practical Skills:** Backend aggregations, data visualization, API integration
- **Manageable Scope:** 3-4 weeks of focused work
- **Real Value:** Users actually care about their stats

## Success Criteria
- Dashboard loads with real user data
- Visualizations are interactive and performant
- AI playlist generation produces relevant results
- Professional UI/UX that matches the app aesthetic

## Timeline Estimate
- Week 1-2: Analytics infrastructure + basic stats
- Week 2-3: Visualizations + advanced analytics
- Week 3-4: AI playlist generator
- Week 4: Polish, testing, documentation
