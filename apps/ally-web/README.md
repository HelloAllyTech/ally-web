# lifeline Web - Mental Health Resource Library

A comprehensive document search platform for mental health professionals, built with Next.js. This application provides access to evidence-based resources, guidelines, and professional documents to support mental health practice.

## Features

- **Document Search**: Advanced search functionality for mental health resources
- **Category Filtering**: Browse resources by specific categories and topics
- **Infinite Scroll**: Seamless loading of search results
- **Responsive Design**: Optimized for desktop and mobile devices
- **Real-time Search**: Instant search results with debounced input
- **Resource Management**: Access to comprehensive mental health documentation

## Technology Stack

- **Framework**: Next.js
- **Language**: TypeScript
- **Styling**: CSS Modules with Custom Properties
- **Build Tool**: Nx
- **Fonts**: Inter (body) & Fraunces (headings)

## Getting Started

1. Navigate to the project root:

```bash
cd lifeline-UI-mono
```

2. Install dependencies (if not already done):

```bash
npm install
```

3. Start the development server:

```bash
npx nx dev lifeline-web
```

The application will be available at `http://localhost:3000`

## Project Structure

```
lifeline-web/
├── src/
│   ├── app/                    # App router components
│   │   ├── layout.tsx         # Root layout with fonts and metadata
│   │   ├── page.tsx          # Main search page component
│   │   ├── api.ts            # API functions for document search
│   │   ├── error.tsx         # Error boundary component
│   │   ├── loading.tsx       # Loading state component
│   │   └── global.css        # Global styles
│   ├── components/            # Reusable components
│   │   └── search-client/    # Search client components
│   └── styles/               # Component-specific styles
├── public/                    # Static assets
└── README.md                 # This file
```

## Available Commands

```bash
# Development
npx nx dev lifeline-web           # Start development server

# Building
npx nx build lifeline-web        # Create production build

# Linting
npx nx lint lifeline-web        # Run ESLint
```

## API Integration

The application integrates with the lifeline backend API to provide:

- **Document Search**: Search through mental health resources and documents
- **Category Management**: Filter resources by categories and topics
- **Pagination**: Efficient loading of large document collections
- **Real-time Updates**: Dynamic content updates and search results

### Environment Variables

Configure the following environment variables:

```bash
NEXT_PUBLIC_API_BASE_URL=your_api_base_url
NEXT_PUBLIC_API_VERSION=your_api_version
```

## Search Features

- **Full-text Search**: Search across document titles, content, and metadata
- **Category Filtering**: Filter results by mental health categories
- **Infinite Scroll**: Load more results as you scroll
- **Responsive Design**: Optimized for all device sizes

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
