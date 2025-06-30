# Ally Web

A modern, responsive landing page for the Ally platform, built with Next.js. This application showcases our mission of empowering mental health professionals with AI assistance.

## Features

- **Modern Design**: Gradient-based UI with smooth animations and transitions
- **Responsive Layout**: Optimized for all screen sizes
- **Performance Focused**: Built with Next.js for optimal loading and rendering
- **Accessibility**: WCAG compliant design and implementation
- **Interactive Elements**: Engaging user interactions and hover effects

## Technology Stack

- **Framework**: Next.js
- **Language**: TypeScript
- **Styling**: CSS Modules with Custom Properties
- **Build Tool**: Nx
- **Fonts**: Inter (body) & Fraunces (headings)

## Getting Started

1. Navigate to the project root:

```bash
cd ally-UI-mono
```

2. Install dependencies (if not already done):

```bash
npm install
```

3. Start the development server:

```bash
npx nx dev ally-web
```

The application will be available at `http://localhost:3000`

## Project Structure

```
ally-web/
├── src/
│   ├── app/                    # App router components
│   │   ├── layout.tsx         # Root layout with fonts
│   │   ├── page.tsx          # Landing page component
│   │   └── global.css        # Global styles
│   ├── components/            # Reusable components
│   └── styles/               # Component-specific styles
├── public/                    # Static assets
└── README.md                 # This file
```

## Available Commands

```bash
# Development
npx nx dev ally-web           # Start development server

# Building
npx nx build ally-web        # Create production build

# Linting
npx nx lint ally-web        # Run ESLint
```

## Styling Guide

The application uses a custom design system with CSS variables:

- **Colors**:
  - Primary: `#7C3AED` (Purple)
  - Secondary: `#22D3EE` (Cyan)
  - Dark: `#1E293B`
  - Light: `#F8FAFC`
  - Accent: `#FB7185`

- **Typography**:
  - Headings: Fraunces
  - Body: Inter
  - Base size: 16px

- **Spacing**:
  - Section padding: 6rem (desktop) / 4rem (mobile)
  - Container max-width: 1200px
  - Grid gap: 2rem

## Development Guidelines

1. **Components**:
   - Keep components focused and single-responsibility
   - Use TypeScript for type safety
   - Follow the existing naming conventions

2. **Styling**:
   - Use CSS Modules for component-specific styles
   - Leverage CSS custom properties for theme values
   - Follow mobile-first responsive design

3. **Performance**:
   - Optimize images and assets
   - Use Next.js features appropriately
   - Monitor bundle size

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

[Add your license information here]
