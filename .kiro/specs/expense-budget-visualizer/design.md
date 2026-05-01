# Design Document: Expense & Budget Visualizer

## Overview

The Expense & Budget Visualizer is a single-page, client-side web application built with plain HTML, CSS, and Vanilla JavaScript. It requires no build tools, no backend, and no package manager. All data is persisted in the browser's Local Storage. The application can be opened directly via `file://` or served from any static HTTP server.

The core user flow is:
1. User enters an expense (name, amount, category) via a form.
2. The transaction is validated, saved to Local Storage, and appended to the transaction list.
3. The total balance display and pie chart update immediately to reflect the new data.
4. Users can delete individual transactions, which also updates the balance and chart in real time.

**Key technology decisions:**
- **Chart.js 4.5.1** loaded via jsDelivr CDN (`https://cdn.jsdelivr.net/npm/chart.js@4.5.1/dist/chart.umd.min.js`) — UMD build works without ES module bundlers and is compatible with `file://` protocol.
- **Local Storage** as the sole persistence layer — no server required.
- **Single CSS file** (`css/styles.css`) and **single JS file** (`js/app.js`) as required by constraints.
- **CSS custom properties** for theming and consistent color tokens.
- **CSS Grid + Flexbox** for responsive layout from 320px to 1920px.

---

## Architecture

The application follows a simple **Model–View–Controller (MVC)** pattern implemented entirely within `js/app.js`. There are no modules or imports — all logic lives in a single IIFE (Immediately Invoked Function Expression) to avoid polluting the global scope while remaining compatible with `file://` protocol (which blocks ES module imports in some browsers).

```
┌─────────────────────────────────────────────────────────┐
│                        index.html                        │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ Balance      │  │ Input Form   │  │ Transaction   │  │
│  │ Display      │  │              │  │ List          │  │
│  └──────────────┘  └──────────────┘  └───────────────┘  │
│  ┌──────────────────────────────────────────────────┐    │
│  │                  Pie Chart (canvas)              │    │
│  └──────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
         │                    │
         ▼                    ▼
  ┌─────────────┐     ┌──────────────────┐
  │  js/app.js  │     │  css/styles.css  │
  │  (IIFE)     │     │                  │
  │  ┌────────┐ │     └──────────────────┘
  │  │ State  │ │
  │  │ (array)│ │
  │  └────────┘ │
  │  ┌────────┐ │
  │  │Storage │ │
  │  │Manager │ │
  │  └────────┘ │
  │  ┌────────┐ │
  │  │Renderer│ │
  │  └────────┘ │
  │  ┌────────┐ │
  │  │Chart   │ │
  │  │Manager │ │
  │  └────────┘ │
  │  ┌────────┐ │
  │  │Validator│ │
  │  └────────┘ │
  └─────────────┘
         │
         ▼
  ┌─────────────┐
  │Local Storage│
  └─────────────┘
```

### Data Flow

```
User submits form
      │
      ▼
  Validator.validate(formData)
      │ valid          │ invalid
      ▼                ▼
  State.add(tx)    show inline errors
      │
      ▼
  StorageManager.save(state)
      │
      ▼
  Renderer.renderList(state)
  Renderer.renderBalance(state)
  ChartManager.update(state)
      │
      ▼
  DOM updated
```

---

## Components and Interfaces

All components are plain JavaScript objects/functions defined inside the IIFE in `js/app.js`.

### State

Holds the in-memory array of transactions. This is the single source of truth.

```js
// Internal state — array of Transaction objects
let transactions = [];

const State = {
  getAll()          // → Transaction[]
  add(tx)           // Transaction → void
  remove(id)        // string → void
  getTotalByCategory() // → { Food: number, Transport: number, Fun: number }
  getTotal()        // → number
};
```

### StorageManager

Handles all reads and writes to Local Storage. Isolates error handling for unavailable or corrupt storage.

```js
const STORAGE_KEY = 'ebv_transactions';

const StorageManager = {
  load()   // → Transaction[] (returns [] on error/missing)
  save(transactions) // Transaction[] → void
};
```

### Validator

Pure validation logic — takes raw form values and returns a result object.

```js
const Validator = {
  validate(name, amount, category)
  // → { valid: boolean, errors: { name?: string, amount?: string, category?: string } }
};
```

### Renderer

Handles all DOM mutations for the transaction list, balance display, and error messages.

```js
const Renderer = {
  renderList(transactions)     // Transaction[] → void (rebuilds list DOM)
  renderBalance(total)         // number → void
  renderErrors(errors)         // errors object → void
  clearErrors()                // → void
  resetForm()                  // → void
  renderEmptyState()           // → void (shows placeholder in list)
};
```

### ChartManager

Wraps the Chart.js instance. Handles creation, update, and empty-state rendering.

```js
const ChartManager = {
  init(canvasEl)               // HTMLCanvasElement → void (creates Chart instance)
  update(categoryTotals)       // { Food, Transport, Fun } → void
  showEmptyState()             // → void (hides canvas, shows placeholder)
  hideEmptyState()             // → void (shows canvas, hides placeholder)
};
```

### EventHandlers

Wires DOM events to state mutations and re-renders.

```js
const EventHandlers = {
  onFormSubmit(event)          // FormEvent → void
  onDeleteClick(event)         // MouseEvent → void (uses event delegation)
};
```

---

## Data Models

### Transaction

```js
/**
 * @typedef {Object} Transaction
 * @property {string} id        - UUID v4 generated via crypto.randomUUID()
 * @property {string} name      - Item name (non-empty string)
 * @property {number} amount    - Positive number, stored as float
 * @property {string} category  - One of: 'Food' | 'Transport' | 'Fun'
 * @property {string} createdAt - ISO 8601 timestamp string
 */
```

**Example:**
```json
{
  "id": "3f2504e0-4f89-11d3-9a0c-0305e82c3301",
  "name": "Lunch",
  "amount": 12.50,
  "category": "Food",
  "createdAt": "2025-01-15T12:30:00.000Z"
}
```

### Local Storage Schema

- **Key:** `ebv_transactions`
- **Value:** JSON-serialized `Transaction[]` array
- **On parse error or missing key:** initialize with `[]`

### Category Color Map

```js
const CATEGORY_COLORS = {
  Food:      '#FF6384',  // coral-red
  Transport: '#36A2EB',  // sky-blue
  Fun:       '#FFCE56',  // amber-yellow
};
```

These colors are visually distinct and meet the Chart.js default palette conventions. They are also referenced in CSS for category badge styling.

### Validation Rules

| Field    | Rule                                              | Error Message                          |
|----------|---------------------------------------------------|----------------------------------------|
| name     | Non-empty after trimming whitespace               | "Item name is required."               |
| amount   | Parseable as float, value > 0, finite             | "Amount must be a positive number."    |
| category | One of 'Food', 'Transport', 'Fun'                 | "Please select a category."            |

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Validator correctly classifies inputs

*For any* combination of name, amount, and category values, `Validator.validate()` shall return `valid: true` if and only if the name is non-empty after trimming, the amount is a finite positive number greater than zero, and the category is one of `'Food'`, `'Transport'`, or `'Fun'`. For any input that fails any of these conditions, it shall return `valid: false` with a non-empty error message for the offending field.

**Validates: Requirements 1.3, 1.4**

---

### Property 2: Add transaction round-trip (state and storage)

*For any* valid transaction (non-empty name, positive amount, valid category), after calling `State.add(tx)` followed by `StorageManager.save(State.getAll())`, a subsequent call to `StorageManager.load()` shall return an array containing a transaction with the same `name`, `amount`, and `category` as the one added.

**Validates: Requirements 1.2, 5.1**

---

### Property 3: Delete transaction round-trip (state and storage)

*For any* non-empty transaction list, after calling `State.remove(id)` for a transaction that exists in the list, followed by `StorageManager.save(State.getAll())`, a subsequent call to `StorageManager.load()` shall return an array that does not contain any transaction with that `id`.

**Validates: Requirements 2.4, 5.2**

---

### Property 4: Storage load round-trip

*For any* array of valid transactions serialized and written to Local Storage under the key `ebv_transactions`, `StorageManager.load()` shall return an array of equal length containing transactions with identical `id`, `name`, `amount`, and `category` fields.

**Validates: Requirements 2.2, 5.3**

---

### Property 5: Malformed storage yields empty array without error

*For any* string stored under `ebv_transactions` that is not valid JSON, or is valid JSON but not an array, `StorageManager.load()` shall return an empty array `[]` and shall not throw any exception.

**Validates: Requirements 5.4**

---

### Property 6: Total balance reflects all transaction amounts

*For any* array of transactions, `State.getTotal()` shall return a value equal to the arithmetic sum of all `amount` fields in the array. When the array is empty, the result shall be `0`. After adding a transaction with amount `a` to a state with total `t`, the new total shall equal `t + a`. After removing a transaction with amount `a` from a state with total `t`, the new total shall equal `t - a`.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

---

### Property 7: Category totals correctly partition all transactions

*For any* array of transactions, `State.getTotalByCategory()` shall return an object where each category key (`Food`, `Transport`, `Fun`) maps to the sum of `amount` values for all transactions in that category. The sum of all category values shall equal `State.getTotal()`. Categories with no transactions shall map to `0`.

**Validates: Requirements 4.1, 4.2, 4.3, 4.4**

---

### Property 8: Transaction list rendering includes all required fields

*For any* array of transactions, after `Renderer.renderList(transactions)` is called, the resulting DOM shall contain one list item per transaction, and each item's text content shall include the transaction's `name`, the `amount` formatted to exactly two decimal places, and the `category`.

**Validates: Requirements 2.1**

---

## Error Handling

### Validation Errors

- Inline error messages are rendered adjacent to the invalid field using `aria-live="polite"` regions so screen readers announce them.
- Errors are cleared on each new submission attempt before re-validating.
- The form is not submitted (no state mutation, no storage write) if validation fails.

### Local Storage Errors

- `StorageManager.load()` wraps `localStorage.getItem()` and `JSON.parse()` in a `try/catch`. On any error (SecurityError, SyntaxError, QuotaExceededError on read), it returns `[]`.
- `StorageManager.save()` wraps `localStorage.setItem()` in a `try/catch`. On QuotaExceededError or SecurityError, it silently fails — the in-memory state remains correct even if persistence fails. A console warning is emitted.

### Chart.js Load Failure

- If the Chart.js CDN script fails to load (offline, blocked), the `ChartManager.init()` call will detect that `window.Chart` is undefined and display a static fallback message in the chart container instead of throwing.

### Malformed Transaction Data

- On load, each item in the parsed array is validated to have `id` (string), `name` (string), `amount` (positive number), and `category` (valid enum value). Items failing this check are silently discarded, preventing corrupt data from breaking the UI.

---

## Testing Strategy

### Applicability of Property-Based Testing

This feature contains pure logic functions (`Validator.validate`, `State.getTotal`, `State.getTotalByCategory`, `StorageManager.load/save`) that are well-suited to property-based testing. The input space (transaction names, amounts, categories) is large and varied, making PBT valuable for finding edge cases.

UI rendering and CSS layout requirements (Requirements 6, 7) are not suitable for PBT and will be verified manually or via smoke tests.

### Property-Based Testing Library

**[fast-check](https://fast-check.dev/)** for JavaScript — loaded via CDN for test files, or used in a Node.js test runner (Jest/Vitest) during development. Minimum **100 iterations** per property test.

> Note: Per project constraints, no HTML or JS test files are committed to the repository. Property tests are described here as specifications for manual verification or future CI integration.

### Property Test Specifications

Each property test must be tagged with:
`// Feature: expense-budget-visualizer, Property N: <property_text>`

| Property | Test Description | Generators |
|----------|-----------------|------------|
| P1 | Validator accepts valid / rejects invalid | `fc.string()`, `fc.float()`, `fc.constantFrom(...)` |
| P2 | Add round-trip (state + storage) | `fc.record({ name: fc.string({minLength:1}), amount: fc.float({min:0.01}), category: fc.constantFrom('Food','Transport','Fun') })` |
| P3 | Delete round-trip (state + storage) | Array of valid transactions + pick one to delete |
| P4 | Storage load round-trip | `fc.array(validTransactionArb)` |
| P5 | Malformed storage → empty array | `fc.string()` filtered to non-array JSON |
| P6 | Total balance arithmetic | `fc.array(validTransactionArb)` |
| P7 | Category totals partition | `fc.array(validTransactionArb)` |
| P8 | Render includes all fields | `fc.array(validTransactionArb, {minLength:1})` |

### Unit / Example Tests

- **Empty state**: `transactions = []` → balance shows `0.00`, list shows placeholder, chart shows empty state.
- **Single transaction**: Add one transaction → verify list has 1 item, balance equals amount, chart has one segment.
- **Delete last transaction**: After deleting the only transaction → empty state restored.
- **Invalid form submission**: Submit with empty name → error shown, list unchanged.
- **Currency formatting**: Amount `1.5` renders as `1.50`; amount `100` renders as `100.00`.
- **Storage corruption**: Seed `localStorage` with `"not json"` → app loads with empty state, no error thrown.

### Responsive / Visual Smoke Tests

Manual verification at 320px, 768px, 1280px, and 1920px viewport widths:
- All four primary components visible without horizontal scroll.
- At 768px+, no vertical scroll required to see all components.
- Focus indicators visible on all interactive elements.
- WCAG AA contrast ratio verified with browser DevTools or axe extension.
