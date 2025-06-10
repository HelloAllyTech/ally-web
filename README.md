# Ally UI Monorepo

This monorepo contains the Ally Helpline Dashboard and related applications, built with React, TypeScript, and NX.

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
npm install --legacy-peer-deps
```

3. Create environment files:
Create a `.env` file in `apps/ally-helpline-dashboard` with:
```env
VITE_API_BASE_URL=your_api_url
VITE_API_VERSION=v1
```

4. Start the development server:
```bash
npx nx serve ally-helpline-dashboard
```

## Project Structure

```
ally-UI-mono/
├── apps/
│   └── ally-helpline-dashboard/    # Main dashboard application
├── libs/                           # Shared libraries
├── nx.json                         # NX configuration
├── package.json                    # Root dependencies
└── tsconfig.base.json             # Base TypeScript configuration
```

## Known Issues and Solutions

1. React Version Compatibility
   - The project requires React 18.2.0 for compatibility with dependencies
   - If you encounter React-related errors, ensure both root and app package.json files use the same version

2. Tailwind CSS Configuration
   - Custom theme values should be defined in `tailwind.config.ts`
   - Global styles are managed in `index.css` and `globals.css`

3. Environment Variables
   - Required variables: `VITE_API_BASE_URL` and `VITE_API_VERSION`
   - Environment files must be created manually (not version controlled)

## Available Commands

```bash
# Serve the dashboard application
npx nx serve ally-helpline-dashboard

# Build for production
npx nx build ally-helpline-dashboard

# Run tests
npx nx test ally-helpline-dashboard

# Lint code
npx nx lint ally-helpline-dashboard
```

## Development Guidelines

1. **Dependencies**: Use `--legacy-peer-deps` when installing new packages to handle React version conflicts
2. **Styling**: Use Tailwind CSS for styling, following the project's theme configuration
3. **TypeScript**: Maintain strict type checking and follow the base TSConfig

## Contributing

1. Create a new branch for your feature/fix
2. Follow the project's code style and conventions
3. Test your changes thoroughly
4. Submit a pull request with a clear description of changes

## Support

For issues and support:
- Check the known issues section above
- Review the project documentation
- Contact the development team

## License

[Add your license information here]
