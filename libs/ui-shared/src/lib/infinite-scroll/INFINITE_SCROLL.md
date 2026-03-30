# InfiniteScroll Component

Triggers a callback when the user scrolls near the bottom of a list, enabling infinite loading of content. Built for use in React projects.

## Features

- IntersectionObserver-based infinite scroll
- Debounced callback to prevent rapid triggers
- Simple API for wrapping any list of children

## Usage

```tsx
import InfiniteScroll from "./InfiniteScroll";

<InfiniteScroll onInfiniteScroll={loadMore} isLoading={loading}>
  {items.map(item => (
    <div key={item.id}>{item.content}</div>
  ))}
</InfiniteScroll>;
```

## Props

| Name               | Type                | Description                                |
| ------------------ | ------------------- | ------------------------------------------ |
| `onInfiniteScroll` | `() => void`        | Callback triggered to load more data       |
| `children`         | `React.ReactNode[]` | Child elements to render                   |
| `isLoading`        | `boolean`           | Loading state to prevent multiple triggers |

## Notes for Contributors

- Consider adding a `hasMore` prop for better control.
- Ensure accessibility and performance for large lists.
- Add tests for new features or bug fixes.
