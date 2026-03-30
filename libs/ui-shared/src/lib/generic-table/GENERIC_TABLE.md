# GenericTable Component

A reusable, type-safe, and highly customizable table component for React. Supports sorting, filtering, custom cell rendering, and infinite scroll ("Load More"). Designed for server-side data fetching and external state management.

---

## Features

- **Type-safe**: Works with any row data type.
- **Sorting**: Per-column, with ASC/DESC/none cycle.
- **Filtering**: Single, multi-select, and date range filters.
- **Custom cell rendering**: Per-column render function.
- **Row click handler**: Optional.
- **Selected filter/sort chips**: Optional display.
- **Infinite scroll**: Optional "Load More" button.
- **Accessible**: Keyboard and screen reader friendly.

---

## Usage

### Basic Example

```tsx
import { GenericTable, Column } from "@lifeline-ui-mono/ui-shared";

const columns: Column<MyRowType>[] = [
  { key: "id", header: "ID" },
  { key: "name", header: "Name", sortable: true },
  {
    key: "status",
    header: "Status",
    filterable: true,
    filterType: "singleSelect",
    filterOptions: [
      { label: "Active", value: "active" },
      { label: "Inactive", value: "inactive" },
    ],
  },
];

<GenericTable columns={columns} data={data} />;
```

### Advanced Example (Server-side sort/filter)

```tsx
const [filters, setFilters] = useState<TableFilter>([]);
const [sort, setSort] = useState<TableSort>({ key: "", value: null });

<GenericTable
  columns={columns}
  data={data}
  showSelectedFilters
  isLoading={loading}
  onFilterChange={({ filter, sort }) => {
    setFilters(filter);
    setSort(sort);
    // Fetch new data from server here
  }}
  handleLoadMore={hasMore ? loadMoreHandler : undefined}
/>;
```

---

## Props

| Prop                  | Type                         | Description                                           |
| --------------------- | ---------------------------- | ----------------------------------------------------- |
| `columns`             | `Column<T>[]`                | Array of column definitions.                          |
| `data`                | `T[]`                        | Array of row data.                                    |
| `initialSort`         | `TableSort`                  | Initial sort state.                                   |
| `initialFilter`       | `TableFilter`                | Initial filter state.                                 |
| `isLoading`           | `boolean`                    | Show loading spinner.                                 |
| `showSelectedFilters` | `boolean`                    | Show chips for selected filters/sort.                 |
| `onRowClick`          | `(row: T) => void`           | Row click handler.                                    |
| `className`           | `string`                     | Additional className for the table wrapper.           |
| `style`               | `React.CSSProperties`        | Additional style for the table wrapper.               |
| `fallbackUI`          | `React.ReactNode`            | UI to show when no data.                              |
| `handleLoadMore`      | `() => void`                 | Handler for "Load More" button (for infinite scroll). |
| `onFilterChange`      | `({ filter, sort }) => void` | Called when filter or sort changes.                   |

---

## Column Definition (`Column<T>`) Props

| Prop            | Type                                                              | Description                        |
| --------------- | ----------------------------------------------------------------- | ---------------------------------- |
| `key`           | `keyof T \| string`                                               | Unique key for the column.         |
| `header`        | `string`                                                          | Header label.                      |
| `icon`          | `React.ReactNode`                                                 | Optional icon for the header.      |
| `sortable`      | `boolean`                                                         | Whether the column is sortable.    |
| `filterable`    | `boolean`                                                         | Whether the column is filterable.  |
| `filterType`    | `'multiselect' \| 'singleSelect' \| 'date' \| 'number' \| 'text'` | Type of filter.                    |
| `filterOptions` | `{ label: string; value: string }[]`                              | Options for select filters.        |
| `render`        | `(value: any, row: T) => React.ReactNode`                         | Custom cell renderer.              |
| `className`     | `string`                                                          | Optional className for the column. |
| `style`         | `React.CSSProperties`                                             | Optional style for the column.     |

---

## Best Practices

- **Server-side data**: Use `onFilterChange` to fetch new data when filters/sort change.
- **Stateless**: The table manages its own sort/filter state unless you use `onFilterChange`.
- **Performance**: Use `useMemo` for columns and data in your parent component if they are large or expensive to compute.
- **Accessibility**: Use semantic HTML and provide accessible labels for custom renderers.

---

## Limitations

- Only supports external control of sort/filter for server-side data fetching.
- No built-in pagination UI (use `handleLoadMore` for infinite scroll).
- Filtering UI supports only select and date types out of the box.

---

## Types

See `types.ts` for all exported types:

- `Column<T>`
- `TableSort`
- `TableFilter`
- `GenericTableProps<T>`

---

## Example: Date Filter Column

```tsx
const columns = [
  {
    key: "createdAt",
    header: "Created At",
    filterable: true,
    filterType: "date",
    // filterOptions can be omitted for date
  },
];
```

---

## Example: Custom Cell Renderer

```tsx
const columns = [
  {
    key: "status",
    header: "Status",
    render: (value, row) => (
      <span style={{ color: value === "active" ? "green" : "red" }}>{value}</span>
    ),
  },
];
```

---

## License

MIT
