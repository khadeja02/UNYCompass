# Chat Application for Hunter College Major Advisor

## Overview

This is a full-stack TypeScript application built with React frontend and Express backend, designed to help Hunter College students find the best major based on their personality types. The application features a chat interface where users can interact with an AI-powered advisor that considers personality assessments in making academic recommendations.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **UI Library**: Radix UI components with shadcn/ui styling system
- **Styling**: Tailwind CSS with custom design tokens
- **State Management**: React Query (@tanstack/react-query) for server state
- **Routing**: Wouter for client-side routing
- **Build Tool**: Vite with React plugin

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon Database (@neondatabase/serverless)
- **Schema Management**: Drizzle Kit for migrations
- **Session Management**: Connect-pg-simple for PostgreSQL session store
- **Development**: tsx for TypeScript execution

### Data Storage Solutions
- **Primary Database**: PostgreSQL (configured for Neon serverless)
- **ORM**: Drizzle ORM with Zod schema validation
- **Session Store**: PostgreSQL-backed session storage
- **Development Fallback**: In-memory storage implementation for development

## Key Components

### Database Schema
- **Users**: User authentication and profile management
- **Personality Types**: Predefined personality categories (Analysts, Diplomats, Sentinels, Explorers)
- **Chat Sessions**: Individual conversation threads linked to personality types
- **Messages**: Individual messages within chat sessions with user/AI attribution

### API Endpoints
- `GET /api/personality-types` - Retrieve available personality types
- `POST /api/chat-sessions` - Create new chat session
- `GET /api/chat-sessions` - Retrieve user's chat sessions
- `POST /api/messages` - Send message and receive AI response
- `GET /api/messages/:sessionId` - Get messages for specific session

### UI Components
- **Chat Interface**: Main conversation view with message history
- **Personality Selection**: Dropdown for choosing personality type
- **Message Input**: Textarea with send functionality
- **Session Management**: Sidebar for managing multiple chat sessions
- **Avatar System**: User and AI message differentiation

## Data Flow

1. **Session Creation**: User selects personality type → Creates chat session → Initializes conversation
2. **Message Flow**: User sends message → Stored in database → AI generates response → Response stored and displayed
3. **State Management**: React Query manages server state, automatic cache invalidation, and optimistic updates
4. **Real-time Updates**: Mutations trigger immediate UI updates with background synchronization

## External Dependencies

### Core Dependencies
- **Database**: Neon PostgreSQL serverless database
- **UI Framework**: Radix UI primitives for accessible components
- **Styling**: Tailwind CSS for utility-first styling
- **Validation**: Zod for runtime type validation
- **Date Handling**: date-fns for date manipulation

### Development Dependencies
- **Build System**: Vite for fast development and building
- **TypeScript**: Full TypeScript support across stack
- **ESBuild**: Fast JavaScript/TypeScript bundler for production
- **Replit Integration**: Development environment optimizations

## Deployment Strategy

### Development Environment
- **Frontend**: Vite dev server with HMR
- **Backend**: tsx for TypeScript execution
- **Database**: Neon PostgreSQL with environment variable configuration
- **Concurrent Development**: Frontend and backend run simultaneously

### Production Build
- **Frontend**: Vite build generates optimized static assets
- **Backend**: ESBuild bundles server code for Node.js execution
- **Database**: Drizzle migrations for schema deployment
- **Static Serving**: Express serves built frontend assets

### Environment Configuration
- `DATABASE_URL`: PostgreSQL connection string (required)
- `NODE_ENV`: Environment mode (development/production)
- Drizzle configuration points to shared schema location

## Changelog

- July 08, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.
