# JEE Test Generation Engine

A desktop application built with Electron, React, and TypeScript for generating JEE (Joint Entrance Examination) tests from a SQLite question database.

## Features

- **Electron + React + TypeScript**: Modern, type-safe desktop application
- **LaTeX Support**: Full LaTeX rendering using KaTeX for mathematical equations and chemical formulas
- **SQLite Database**: Efficient question storage and retrieval
- **Alpha/Beta Constraints**: Configurable constraints for test generation
- **3-Section JEE Format**: Physics, Chemistry, and Mathematics sections
- **Question Selection UI**: Visual interface for selecting questions with real-time validation
- **JSON Export**: Export generated tests as JSON files

## Architecture

### Test Structure

Each JEE test consists of:
- **3 Sections**: Physics, Chemistry, Mathematics
- **25 Questions per Section**: 20 in Division 1, 5 in Division 2
- **Alpha Constraints**: Define question distribution by chapter and difficulty
- **Beta Constraints**: Additional user-defined constraints (extensible)

### Alpha Constraints

For each section, Alpha constraints are defined as:
- `<A, B>`: Distribution across divisions (A = Division 1, B = Division 2)
- `<E, M, H>`: Difficulty distribution (Easy, Medium, Hard)

Where for N chapters:
- A = Σ(a₁, a₂, ..., aₙ) = 20
- B = Σ(b₁, b₂, ..., bₙ) = 5
- `<aₖ, bₖ>` = questions from chapter k in each division
- `<eₖ, mₖ, hₖ>` = difficulty distribution for chapter k

## Getting Started

### Prerequisites

- **Node.js v14 or higher** (v18 LTS recommended)
  - Check version: `node --version`
  - If you have an older version, update Node.js first
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd test-gen
```

2. Install dependencies:
```bash
npm install
```

3. Prepare your question database (SQLite) following the schema in `schema.txt`

### Development

Run the application in development mode:
```bash
npm run electron:dev
```

This will:
1. Start the Vite dev server for React
2. Launch Electron with hot-reload enabled

### Building

Build the application for production:
```bash
npm run build
```

This creates platform-specific installers in the `release/` directory.

**Important**: Before building for distribution to other machines, you must configure OAuth credentials and API keys. See **[BUILD_SETUP.md](./BUILD_SETUP.md)** for detailed instructions on:
- Setting up Google OAuth credentials
- Configuring GitHub and Supabase integration
- Ensuring credentials are bundled with the app
- Distribution checklist

### Troubleshooting

**Native Module Errors (libnode.so.XX not found)**

If you get errors like `libnode.so.72: cannot open shared object file`, rebuild native modules:

```bash
# Quick fix
npm run rebuild

# Or full reinstall
rm -rf node_modules package-lock.json
npm install
```

This happens when `better-sqlite3` needs to be recompiled for your Node.js/Electron version.

**Dev Server Not Loading**

If Electron window is blank:
1. Check that Vite is running on port 5173
2. Look for errors in DevTools (opens automatically)
3. Try: `npm run electron:dev:simple`

## Database Schema

The application expects a SQLite database with the following schema (see `schema.txt` for full details):

- **questions** table with fields:
  - uuid (primary key)
  - question text with LaTeX support
  - 4 options (A, B, C, D) with LaTeX support
  - Schematics (chemfig, circuitikz, tikz)
  - Answer, type, year, tags

## Workflow

1. **Connect Database**: Select your SQLite question database
2. **Create Test**: Enter test code, description, type, and select chapters
3. **Configure Sections**: For each section (Physics, Chemistry, Math):
   - Define Alpha constraints (chapter and difficulty distribution)
   - Optional: Define Beta constraints
4. **Select Questions**: Choose questions following the constraints
5. **Review & Export**: Review the test and export as JSON

## Project Structure

```
test-gen/
├── electron/           # Electron main process
│   ├── main.ts        # Main process entry
│   ├── preload.ts     # Preload script (IPC bridge)
│   └── database.ts    # SQLite service layer
├── src/
│   ├── components/    # React components
│   │   ├── TestCreationForm.tsx
│   │   ├── SectionConfiguration.tsx
│   │   ├── QuestionSelection.tsx
│   │   ├── QuestionDisplay.tsx
│   │   └── LatexRenderer.tsx
│   ├── types/         # TypeScript interfaces
│   │   ├── database.ts
│   │   └── test.ts
│   ├── utils/         # Utility functions
│   │   └── validation.ts
│   ├── styles/        # CSS files
│   ├── App.tsx        # Main app component
│   └── main.tsx       # React entry point
├── schema.txt         # Database schema reference
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Technology Stack

- **Electron**: Desktop application framework
- **React 18**: UI library
- **TypeScript**: Type-safe development
- **Vite**: Fast build tool and dev server
- **KaTeX**: LaTeX rendering
- **better-sqlite3**: SQLite database interface

## Extensibility

The application is designed with extensibility in mind:

- **Beta Constraints**: Placeholder for additional constraint types
- **Algorithm Input**: Provision for custom Alpha computation algorithms
- **Additional Features**: Clean architecture allows easy feature additions

## MVP Status

This is the Minimum Viable Product (MVP) with:
- ✅ Core test generation workflow
- ✅ LaTeX rendering
- ✅ Alpha constraint configuration
- ✅ Question selection interface
- ✅ JSON export

### Planned Features
- Beta constraint implementation
- Algorithm input for Alpha computation
- Enhanced question filtering
- Test templates
- Question preview improvements
- Batch test generation

## License

MIT

## Contributing

Contributions are welcome! Please ensure:
1. TypeScript types are properly defined
2. Components are documented
3. CSS follows the existing style guide
4. Tests pass (when test suite is added)
