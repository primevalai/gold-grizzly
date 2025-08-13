# CLAUDE.md - UI Module

## Project Information

This file contains UI-specific project information and context for Claude Code within the gold-grizzly/.apps/ui module.

## Critical Directives

### Node.js Environment Management

**MANDATORY: Use BUN for all Node.js operations**

All Node.js work in this project MUST use the BUN package manager and execution environment:

- **Script Execution**: Always use `bun run <script>` instead of `npm run` or `yarn run`
- **Package Installation**: Use `bun install <package>` instead of `npm install` or `yarn add`
- **Dependency Management**: Use `bun add <package>` for adding dependencies
- **Development Server**: Use `bun dev` instead of `npm run dev`

**Rationale**: BUN provides significantly faster package management, dependency resolution, and script execution. It ensures consistent environments across all development contexts with native TypeScript support.

**Examples**:
```bash
# Correct
bun install
bun add next react react-dom
bun run dev
bun run build

# Incorrect - DO NOT USE
npm install
yarn add next react react-dom
npm run dev
yarn build
```

## Next.js Project Standards

### Core Requirements

- **Node.js Version**: Require Node.js 20.x for broad adoption and compatibility with Next.js
- **HTTP Client**: Use `fetch` (native in Bun and Node.js 20.x) for async HTTP calls, aligning with Next.js APIs
- **Code Style**: Follow Airbnb JavaScript/TypeScript style guide (2-space indent, camelCase, 80-char lines). Enforce with ESLint (Airbnb config) and Prettier
- **Documentation**: Write JSDoc for all functions, components, modules to support TypeScript and API docs. Check with ESLint's `jsdoc` plugin
- **Project Metadata**: Define metadata and dependencies in `package.json`
- **Build System**: Use `bun` for dependency management and build scripts (`next`, `react`, `typescript`)

### Component Architecture

**MANDATORY: Shadcn/ui Component Strategy**

- **Base Components**: Import Shadcn/ui components into `src/components/ui/` directory (READONLY)
- **Custom Components**: Build composed components on top of Shadcn base components
- **Component Organization**: Follow clear separation between base UI and business logic components
- **Styling**: Use Tailwind CSS classes with Shadcn's design system

**Component Structure**:
```
src/
├── components/
│   ├── ui/           # Shadcn components (READONLY - DO NOT EDIT)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   └── ...
│   ├── EventList.tsx     # Custom composed components
│   ├── EventCard.tsx     # Built on top of Shadcn base
│   └── EventStream.tsx   # Business logic components
```

### Design Principles

- **React/Next.js Principles**: Follow React/Next.js principles (small components, explicit props, server components)
- **Next.js Guidelines**: Use TypeScript, App Router, server components, modular structure (`app/`, `components/`, `lib/`)
- **Testing**: Test with Jest/Playwright for comprehensive coverage
- **Modular Architecture**: Clear separation of concerns between UI, business logic, and data layers

### Code Organization Requirements

**MANDATORY: Modern Next.js App Router Structure**

- **App Directory**: Use Next.js 13+ App Router (`app/` directory)
- **Server Components**: Prefer server components by default, use client components only when needed
- **Route Organization**: Follow Next.js file-based routing conventions
- **Type Safety**: All components must include proper TypeScript interfaces

**Directory Structure**:
```
src/
├── app/
│   ├── layout.tsx        # Root layout (server component)
│   ├── page.tsx          # Home page
│   ├── globals.css       # Global styles
│   └── ...
├── components/
│   ├── ui/               # Shadcn base components (readonly)
│   └── ...               # Custom composed components
├── hooks/
│   └── ...               # Custom React hooks
├── lib/
│   └── utils.ts          # Utility functions
└── types/
    └── ...               # TypeScript type definitions
```

### Development Workflow

**Pre-Development Checklist:**
1. ✅ BUN environment configured
2. ✅ Shadcn/ui components imported to readonly directory
3. ✅ ESLint and Prettier configured with Airbnb rules
4. ✅ TypeScript strict mode enabled
5. ✅ Proper component architecture established

**Code Standards:**
- 2-space indentation
- 80-character line length
- camelCase for variables and functions
- PascalCase for components and types
- Comprehensive JSDoc documentation
- Strict TypeScript compliance

All development must maintain compliance with the above standards through automated tooling and manual review processes.