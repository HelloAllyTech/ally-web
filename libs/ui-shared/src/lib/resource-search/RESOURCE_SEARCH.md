# ResourceSearch Component

A flexible and extensible search interface for filtering and displaying resources by category, with infinite scroll and suggestions support. Built for use in React projects.

## Features

- Category-based filtering with tabs
- Infinite scroll for resource lists
- Search bar with suggestions
- Loading and empty states
- Mobile-friendly design

## Usage

```tsx
import ResourceSearch from "./ResourceSearch";

<ResourceSearch
  resources={resourcesArray}
  selectedCategory="All"
  onCategoryChange={handleCategoryChange}
  onSearch={handleSearch}
  isLoading={loading}
  searchQuery={searchTerm}
  showHeader={true}
  fullWidth={false}
  showHeaderDescriptionInMobile={true}
  isSuggestionsCenter={false}
  isSuggestionsRow={false}
  categoryCountList={categoryCounts}
  onInfiniteScroll={handleInfiniteScroll}
/>;
```

## Props

| Name                            | Type                           | Default    | Description                                      |
| ------------------------------- | ------------------------------ | ---------- | ------------------------------------------------ |
| `resources`                     | `Resource[]`                   | `[]`       | List of resources to display                     |
| `selectedCategory`              | `string`                       | `"All"`    | Currently selected category                      |
| `onCategoryChange`              | `(category: string) => void`   | `() => {}` | Callback when category changes                   |
| `onInfiniteScroll`              | `() => void`                   | `() => {}` | Callback for infinite scroll trigger             |
| `onSearch`                      | `(searchTerm: string) => void` |            | Callback when a search is performed              |
| `isLoading`                     | `boolean`                      | `false`    | Loading state                                    |
| `searchQuery`                   | `string`                       |            | Current search query                             |
| `showHeader`                    | `boolean`                      | `true`     | Show the header section                          |
| `fullWidth`                     | `boolean`                      | `false`    | Make the component full width                    |
| `showHeaderDescriptionInMobile` | `boolean`                      | `true`     | Show header description on mobile                |
| `isSuggestionsCenter`           | `boolean`                      | `false`    | Center suggestions container                     |
| `isSuggestionsRow`              | `boolean`                      | `false`    | Display suggestions in a row                     |
| `categoryCountList`             | `{ [key: string]: number }`    |            | Object mapping category names to resource counts |

## Notes for Contributors

- Ensure all new props are documented in this file and in the code.
- Keep UI/UX accessible and mobile-friendly.
- Add tests for new features or bug fixes.
