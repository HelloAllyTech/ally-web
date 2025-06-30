# Ally Helpline Dashboard

A modern web interface for mental health professionals built with React, TypeScript, and Vite. This application is part of the Ally UI monorepo.

## Features

- 💬 Real-time chat system for client communication
- 📅 Appointment scheduling and calendar management
- 📊 Analytics and reporting dashboard
- 📝 Case management and documentation
- 🔐 Secure authentication and authorization
- 🎨 Modern UI with dark/light theme support

## Tech Stack

- **Framework**: React 18.2.0
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + Shadcn/UI
- **State Management**: React Query
- **Animations**: Framer Motion
- **Type Safety**: TypeScript
- **Monorepo Management**: NX

## Local Development

1. Ensure you're in the correct directory:

```bash
cd apps/ally-helpline-dashboard
```

2. Create a `.env` file with required variables:

```env
VITE_API_BASE_URL=your_api_url
VITE_API_VERSION=v1
```

3. Start the development server:

```bash
npx nx serve ally-helpline-dashboard
```

The application will be available at `http://localhost:4200`

## Project Structure

```
ally-helpline-dashboard/
├── src/
│   ├── components/     # Reusable UI components
│   ├── lib/           # Utilities and helpers
│   ├── pages/         # Route components
│   ├── hooks/         # Custom React hooks
│   ├── styles/        # Global styles and Tailwind config
│   └── types/         # TypeScript type definitions
├── public/           # Static assets
├── vite.config.ts    # Vite configuration
├── tailwind.config.ts # Tailwind CSS configuration
└── tsconfig.json     # TypeScript configuration
```

## Available Scripts

```bash
# Development
npx nx serve ally-helpline-dashboard    # Start dev server
npx nx lint ally-helpline-dashboard     # Run ESLint
npx nx test ally-helpline-dashboard     # Run tests

# Production
npx nx build ally-helpline-dashboard    # Create production build
```

## Styling Guidelines

- Use Tailwind CSS utility classes for styling
- Follow the theme configuration in `tailwind.config.ts`
- Use Shadcn/UI components for consistent UI elements
- Support both light and dark themes

## Best Practices

1. **Components**
   - Use functional components with TypeScript
   - Implement proper prop types and interfaces
   - Keep components small and focused

2. **State Management**
   - Use React Query for server state
   - Implement proper error handling
   - Cache responses appropriately

3. **Performance**
   - Lazy load routes and heavy components
   - Optimize images and assets
   - Implement proper memoization

## Troubleshooting

If you encounter issues:

1. **Build Errors**
   - Ensure React version is 18.2.0
   - Clear node_modules and reinstall with `--legacy-peer-deps`
   - Check for environment variables

2. **Styling Issues**
   - Verify Tailwind configuration
   - Check for proper class names
   - Ensure proper import of global styles

## Contributing

Please refer to the root README for contribution guidelines.

## License

[Add your license information here]
