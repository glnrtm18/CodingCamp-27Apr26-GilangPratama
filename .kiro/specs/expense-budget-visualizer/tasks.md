# Implementation Plan: Expense & Budget Visualizer

## Overview

Implement a single-page, client-side expense tracker using plain HTML, CSS, and Vanilla JavaScript. All logic lives in a single IIFE inside `js/app.js`. Chart.js 4.5.1 is loaded via jsDelivr CDN. Data is persisted in Local Storage. The app must work via `file://` protocol and be responsive from 320px to 1920px.

## Tasks

- [x] 1. Create project file structure and HTML skeleton
  - Create `index.html` with semantic HTML5 structure
  - Add `<link>` to `css/styles.css` and `<script>` tags for Chart.js CDN (`https://cdn.jsdelivr.net/npm/chart.js@4.5.1/dist/chart.umd.min.js`) and `js/app.js` (defer)
  - Add Balance_Display section (`<header>` or `<section>`) with a prominent total amount element
  - Add Input_Form with: text input for item name, number input for amount, `<select>` for category (Food, Transport, Fun), submit button, and inline error containers with `aria-live="polite"`
  - Add Transaction_List container (`<ul>` or `<ol>`) with an empty-state placeholder element
  - Add chart container with a `<canvas id="expenseChart">` and a chart empty-state placeholder
  - Create empty `css/styles.css` and empty `js/app.js` files
  - _Requirements: 1.1, 2.1, 2.5, 3.1, 4.5, 6.3, 6.4, 7.1, 7.4_

- [x] 2. Implement CSS layout and visual design
  - [x] 2.1 Define CSS custom properties and base styles
    - Declare color tokens (`--color-food`, `--color-transport`, `--color-fun`, background, text, border, focus ring) as CSS custom properties on `:root`
    - Set base `font-family`, `font-size`, `line-height`, `box-sizing: border-box`, and color/background defaults
    - Ensure text/background contrast meets WCAG AA (≥ 4.5:1 for normal text)
    - _Requirements: 7.2_

  - [x] 2.2 Implement responsive grid layout
    - Use CSS Grid for the main page layout: single-column on narrow viewports (320px–767px), two-column on wider viewports (≥ 768px) so all primary components are visible without scrolling
    - Use Flexbox for internal component layout (form rows, list items, balance display)
    - _Requirements: 7.3, 7.4_

  - [x] 2.3 Style Balance_Display, Input_Form, and Transaction_List
    - Style the balance total with large, prominent typography
    - Style form inputs, select, and submit button with clear borders, padding, and hover/focus states
    - Add visible focus indicators (outline or ring) on all interactive elements
    - Style transaction list items to show name, amount, category badge, and delete button in a readable row
    - Style the empty-state placeholder text for both the list and chart container
    - Style category badges using the CSS custom property color tokens
    - _Requirements: 2.1, 2.5, 7.1, 7.2, 7.5_

  - [x] 2.4 Style chart container and responsive breakpoints
    - Constrain the `<canvas>` to a sensible max-width and maintain aspect ratio
    - Add `@media` breakpoints to adjust layout at 320px, 768px, and 1920px
    - _Requirements: 7.3, 7.4_

- [x] 3. Implement IIFE scaffold and data model in js/app.js
  - Wrap all code in `(function () { 'use strict'; /* ... */ })();`
  - Define the `STORAGE_KEY` constant (`'ebv_transactions'`)
  - Define the `VALID_CATEGORIES` constant array (`['Food', 'Transport', 'Fun']`)
  - Define the `CATEGORY_COLORS` map (`{ Food: '#FF6384', Transport: '#36A2EB', Fun: '#FFCE56' }`)
  - Define the `transactions` array (in-memory state, initialized to `[]`)
  - _Requirements: 6.1, 6.3, 6.5_

- [x] 4. Implement StorageManager
  - [x] 4.1 Implement `StorageManager.load()`
    - Wrap `localStorage.getItem(STORAGE_KEY)` and `JSON.parse()` in `try/catch`
    - On missing key or any error (SyntaxError, SecurityError), return `[]`
    - After parsing, filter out items that lack a valid `id` (string), `name` (string), `amount` (positive finite number), or `category` (member of `VALID_CATEGORIES`) — discard malformed entries silently
    - _Requirements: 5.3, 5.4_

  - [ ]* 4.2 Write property test for StorageManager load round-trip
    - **Property 4: Storage load round-trip** — for any array of valid transactions serialized to `ebv_transactions`, `StorageManager.load()` returns an array of equal length with identical `id`, `name`, `amount`, and `category` fields
    - **Validates: Requirements 2.2, 5.3**

  - [ ]* 4.3 Write property test for malformed storage
    - **Property 5: Malformed storage yields empty array without error** — for any non-JSON string or non-array JSON value stored under `ebv_transactions`, `StorageManager.load()` returns `[]` and does not throw
    - **Validates: Requirements 5.4**

  - [x] 4.4 Implement `StorageManager.save(transactions)`
    - Wrap `localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions))` in `try/catch`
    - On QuotaExceededError or SecurityError, emit `console.warn` and return without throwing
    - _Requirements: 5.1, 5.2_

- [x] 5. Implement State
  - [x] 5.1 Implement `State.getAll()`, `State.add(tx)`, `State.remove(id)`
    - `getAll()` returns a shallow copy of the `transactions` array
    - `add(tx)` pushes `tx` onto `transactions`
    - `remove(id)` filters out the transaction with the matching `id`
    - _Requirements: 1.2, 2.4_

  - [x] 5.2 Implement `State.getTotal()` and `State.getTotalByCategory()`
    - `getTotal()` returns the sum of all `amount` fields; returns `0` for an empty array
    - `getTotalByCategory()` returns `{ Food: number, Transport: number, Fun: number }` where each value is the sum of amounts for that category; categories with no transactions map to `0`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.1_

  - [ ]* 5.3 Write property test for total balance
    - **Property 6: Total balance reflects all transaction amounts** — `State.getTotal()` equals the arithmetic sum of all `amount` fields; empty array returns `0`; adding a transaction with amount `a` to total `t` yields `t + a`; removing a transaction with amount `a` from total `t` yields `t - a`
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4**

  - [ ]* 5.4 Write property test for category totals
    - **Property 7: Category totals correctly partition all transactions** — `State.getTotalByCategory()` maps each category to the correct sum; the sum of all category values equals `State.getTotal()`; categories with no transactions map to `0`
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4**

  - [ ]* 5.5 Write property test for add/remove round-trip
    - **Property 2: Add transaction round-trip** — after `State.add(tx)` + `StorageManager.save()` + `StorageManager.load()`, the returned array contains a transaction with the same `name`, `amount`, and `category`
    - **Property 3: Delete transaction round-trip** — after `State.remove(id)` + `StorageManager.save()` + `StorageManager.load()`, the returned array contains no transaction with that `id`
    - **Validates: Requirements 1.2, 2.4, 5.1, 5.2**

- [x] 6. Checkpoint — core state and storage
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement Validator
  - [x] 7.1 Implement `Validator.validate(name, amount, category)`
    - Return `{ valid: true, errors: {} }` when: `name.trim()` is non-empty, `parseFloat(amount)` is finite and `> 0`, and `category` is in `VALID_CATEGORIES`
    - Return `{ valid: false, errors: { name?: string, amount?: string, category?: string } }` with the appropriate error message for each failing field
    - Error messages: `"Item name is required."`, `"Amount must be a positive number."`, `"Please select a category."`
    - _Requirements: 1.3, 1.4_

  - [ ]* 7.2 Write property test for Validator
    - **Property 1: Validator correctly classifies inputs** — for any combination of name/amount/category, `Validator.validate()` returns `valid: true` iff all three conditions hold; returns `valid: false` with a non-empty error message for each failing field otherwise
    - **Validates: Requirements 1.3, 1.4**

- [x] 8. Implement Renderer
  - [x] 8.1 Implement `Renderer.renderBalance(total)`
    - Update the Balance_Display element's text content with `total` formatted to two decimal places (e.g., `"$12.50"` or `"12.50"`)
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 8.2 Implement `Renderer.renderList(transactions)` and `Renderer.renderEmptyState()`
    - Clear the list container and rebuild it from the `transactions` array
    - Each list item must include: item name, amount formatted to two decimal places, category badge, and a delete button with a `data-id` attribute set to the transaction's `id`
    - When `transactions` is empty, call `renderEmptyState()` to show the placeholder message and hide the list
    - _Requirements: 2.1, 2.2, 2.5_

  - [ ]* 8.3 Write property test for list rendering
    - **Property 8: Transaction list rendering includes all required fields** — after `Renderer.renderList(transactions)`, the DOM contains one list item per transaction, each including the transaction's `name`, `amount` formatted to two decimal places, and `category`
    - **Validates: Requirements 2.1**

  - [x] 8.4 Implement `Renderer.renderErrors(errors)` and `Renderer.clearErrors()`
    - `renderErrors(errors)` populates the `aria-live="polite"` error containers adjacent to each field
    - `clearErrors()` empties all error containers
    - _Requirements: 1.4_

  - [x] 8.5 Implement `Renderer.resetForm()`
    - Reset all Input_Form fields to their default empty/unselected state after a successful submission
    - _Requirements: 1.5_

- [x] 9. Implement ChartManager
  - [x] 9.1 Implement `ChartManager.init(canvasEl)`
    - Guard against `window.Chart` being undefined (CDN load failure); if undefined, display a static fallback message in the chart container and return early
    - Create a `new Chart(canvasEl, { type: 'pie', ... })` instance with `CATEGORY_COLORS` and empty initial data
    - Store the instance for later updates
    - _Requirements: 4.1, 4.6_

  - [x] 9.2 Implement `ChartManager.update(categoryTotals)`
    - Update the Chart.js instance's `data.datasets[0].data` with values from `categoryTotals` in `[Food, Transport, Fun]` order
    - Call `chart.update()` to re-render
    - If all category totals are `0`, call `showEmptyState()`; otherwise call `hideEmptyState()`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 9.3 Implement `ChartManager.showEmptyState()` and `ChartManager.hideEmptyState()`
    - Toggle visibility of the `<canvas>` and the chart empty-state placeholder element
    - _Requirements: 4.5_

- [x] 10. Implement EventHandlers and application bootstrap
  - [x] 10.1 Implement `EventHandlers.onFormSubmit(event)`
    - Call `event.preventDefault()`
    - Read name, amount, category from the form
    - Call `Renderer.clearErrors()`
    - Call `Validator.validate(name, amount, category)`
    - On invalid: call `Renderer.renderErrors(errors)` and return
    - On valid: build a `Transaction` object using `crypto.randomUUID()` for `id` and `new Date().toISOString()` for `createdAt`
    - Call `State.add(tx)`, `StorageManager.save(State.getAll())`, `Renderer.renderList(State.getAll())`, `Renderer.renderBalance(State.getTotal())`, `ChartManager.update(State.getTotalByCategory())`, `Renderer.resetForm()`
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 3.2, 4.2, 5.1_

  - [x] 10.2 Implement `EventHandlers.onDeleteClick(event)` with event delegation
    - Attach a single `click` listener to the Transaction_List container
    - Check if the clicked element (or its closest ancestor) is a delete button with a `data-id` attribute
    - Call `State.remove(id)`, `StorageManager.save(State.getAll())`, `Renderer.renderList(State.getAll())`, `Renderer.renderBalance(State.getTotal())`, `ChartManager.update(State.getTotalByCategory())`
    - _Requirements: 2.4, 3.3, 4.3, 5.2_

  - [x] 10.3 Implement application bootstrap (`init` function)
    - Load transactions from `StorageManager.load()` into `transactions`
    - Call `ChartManager.init(document.getElementById('expenseChart'))`
    - Call `Renderer.renderList(State.getAll())`, `Renderer.renderBalance(State.getTotal())`, `ChartManager.update(State.getTotalByCategory())`
    - Attach `EventHandlers.onFormSubmit` to the form's `submit` event
    - Attach `EventHandlers.onDeleteClick` to the Transaction_List container's `click` event
    - Call `init()` at the bottom of the IIFE
    - _Requirements: 2.2, 5.3, 5.4, 6.5_

- [x] 11. Final checkpoint — full integration
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties defined in the design document
- No HTML or JS test files should be generated as part of this implementation
- The app must work via `file://` protocol — no ES module imports, no relative fetch calls
