# Ally UI Monorepo

This monorepo contains multiple applications for the Ally platform:

- Ally Web: A modern landing page for our mental health AI assistance platform
- Ally Helpline Dashboard: Dashboard application for mental health professionals

## Prerequisites

- Node.js (LTS version recommended)
- npm or yarn
- Git

## Setup Instructions

1. Clone the repository:

```bash
git clone <repository-url>
cd ally-UI-mono
```

2. Install dependencies:

```bash
npm install
```

3. Start the development servers:

For Ally Web:

```bash
npx nx dev ally-web
```

For Ally Helpline Dashboard:

```bash
npx nx serve ally-helpline-dashboard
```

## Project Structure

```
ally-UI-mono/
├── apps/
│   ├── ally-web/                  # Landing page application
│   └── ally-helpline-dashboard/   # Main dashboard application
├── libs/                          # Shared libraries
├── nx.json                        # NX configuration
├── package.json                   # Root dependencies
└── tsconfig.base.json            # Base TypeScript configuration
```

## Applications

### Ally Web (apps/ally-web)

A Next.js application showcasing our platform's features and mission:

- Modern, responsive design
- Gradient-based UI components
- Interactive elements and smooth animations
- Optimized for performance and accessibility

### Ally Helpline Dashboard (apps/ally-helpline-dashboard)

The main dashboard application for mental health professionals.

## Available Commands

```bash
# Ally Web Commands
npx nx dev ally-web           # Start development server
npx nx build ally-web        # Build for production
npx nx lint ally-web        # Lint code

# Ally Helpline Dashboard Commands
npx nx serve ally-helpline-dashboard
npx nx build ally-helpline-dashboard
npx nx test ally-helpline-dashboard
npx nx lint ally-helpline-dashboard
```

## Development Guidelines

1. **Code Style**: Follow the project's ESLint and Prettier configurations
2. **Styling**:
   - Ally Web: Uses CSS Modules with custom properties
   - Dashboard: Uses Tailwind CSS
3. **TypeScript**: Maintain strict type checking and follow the base TSConfig
4. **Components**: Create reusable components in the appropriate application's components directory

## Contributing

1. Create a new branch for your feature/fix
2. Follow the project's code style and conventions
3. Test your changes thoroughly
4. Submit a pull request with a clear description of changes

## Support

For issues and support:

- Check the project documentation
- Review existing issues
- Contact the development team

## License

[Add your license information here]
