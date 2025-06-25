# GenericTable Component

A highly customizable, type-safe, and reusable table component for React, supporting sorting, filtering, custom cell rendering, and row click handling. Designed for both client-side and server-side data workflows.

---

## Features
- **Type-safe columns and data**
- **Sorting**: Clickable column headers for ascending/descending sort
- **Filtering**: Per-column filter popovers with search and selectable options
- **Custom cell rendering**: Render any React node in a cell
- **Row click handling**: Optional callback for row selection
- **Fallback UI**: Customizable empty state or loading UI
- **Styling**: Pass custom className and style
- **External control**: Optionally control sort/filter state for server-side data

---

## Usage

```tsx
import GenericTable from '@ally-ui-mono/ui-shared/lib/generic-table';
import type { Column } from '@ally-ui-mono/ui-shared/lib/generic-table/types';

const columns: Column<MyRowType>[] = [
  { key: 'id', header: 'ID', sortable: true },
  { key: 'name', header: 'Name', filterable: true, filterOptions: ['Alice', 'Bob'] },
  { key: 'score', header: 'Score', render: (value) => <b>{value}</b> },
];

const data = [
  { id: 1, name: 'Alice', score: 95 },
  { id: 2, name: 'Bob', score: 88 },
];

<GenericTable
  columns={columns}
  data={data}
  onRowClick={(row) => alert(row.id)}
  fallbackUI={<div>No data!</div>}
/>
```

---

## Props

| Prop              | Type                                                                 | Description                                                                                       |
|-------------------|----------------------------------------------------------------------|---------------------------------------------------------------------------------------------------|
| `columns`         | `Column<T>[]`                                                        | Array of column definitions (see below)                                                           |
| `data`            | `T[]`                                                                | Array of row data                                                                                 |
| `initialSort`     | `{ key: string, direction: 'asc'\|'desc'\|null }`                   | Initial sort state (optional)                                                                     |
| `initialFilter`   | `{ [key: string]: string }`                                          | Initial filter state (optional)                                                                   |
| `onRowClick`      | `(row: T) => void`                                                   | Callback when a row is clicked (optional)                                                         |
| `className`       | `string`                                                             | Custom class for the table container (optional)                                                   |
| `style`           | `React.CSSProperties`                                                | Custom style for the table container (optional)                                                   |
| `fallbackUI`      | `React.ReactNode`                                                    | UI to show when no data is present (optional)                                                     |
| `onSortChange`    | `(key, setSort) => void`                                             | External sort handler (for server-side sorting, optional)                                         |
| `onFilterChange`  | `(key, value, setFilter, setPagination) => void`                     | External filter handler (for server-side filtering, optional)                                     |

---

## Column Definition

Each column is defined as:

```ts
interface Column<T> {
  key: keyof T | string;
  header: string;
  sortable?: boolean;
  filterable?: boolean;
  filterOptions?: string[]; // Required for filterable columns
  render?: (value: any, row: T) => React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}
```

- **sortable**: Enables sort icon and click-to-sort for the column
- **filterable**: Enables filter popover (requires `filterOptions`)
- **filterOptions**: List of options for filtering (shown in popover with search)
- **render**: Custom cell renderer (receives value and row)
- **className/style**: Custom styles for the column's cells

---

## Customization & Advanced Usage

- **Custom Cell Rendering**: Use the `render` property in a column to render any React node (e.g., buttons, icons, formatted values).
- **Row Clicks**: Pass `onRowClick` to handle row selection or navigation.
- **Fallback UI**: Pass `fallbackUI` to show a custom message or loader when data is empty.
- **Styling**: Use `className` and `style` for custom container styles. Use `className`/`style` in columns for per-column cell styles.
- **External Sort/Filter**: For server-side data, use `onSortChange` and `onFilterChange` to control state externally.

---

## Pagination

Pagination is not handled internally by `GenericTable`. Use a separate pagination component (e.g., `@ally-ui-mono/ui-shared/lib/pagination`) and manage paged data in your parent component:

```tsx
import Pagination from '@ally-ui-mono/ui-shared/lib/pagination';

// ...
<GenericTable columns={columns} data={pagedData} />
<Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
```

---

## Example: Sort, Filter, and Custom Render

```tsx
const columns = [
  { key: 'id', header: 'ID', sortable: true },
  { key: 'name', header: 'Name', filterable: true, filterOptions: ['Alice', 'Bob'] },
  { key: 'score', header: 'Score', render: (value) => <b>{value}</b> },
  { key: 'actions', header: 'Actions', render: (_v, row) => <button onClick={() => alert(row.id)}>View</button> },
];
```

---

## Notes
- **Type Safety**: The table is generic and type-safe for your row data.
- **No Internal Pagination**: Pagination must be handled outside the table.
- **Server-side Data**: Use external sort/filter handlers for remote data workflows.
- **Accessibility**: Uses semantic table elements and accessible controls.

---

## Sample

![Screenshot 2025-06-25 at 10 00 55 PM](https://github.com/user-attachments/assets/ac338434-4936-4aab-9931-1d586b3e12dc)


---

## License
MIT 
