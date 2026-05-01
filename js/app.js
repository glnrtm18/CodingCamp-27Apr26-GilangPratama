/* Expense & Budget Visualizer — app.js */

(function () {
  'use strict';

  /* ── Constants ─────────────────────────────────────────────────────────── */

  /** Local Storage key used to persist the transaction list. */
  const STORAGE_KEY = 'ebv_transactions';

  /** Allowed category values for a transaction. */
  const VALID_CATEGORIES = ['Food', 'Transport', 'Fun'];

  /** Pie-chart / badge colors keyed by category name. */
  const CATEGORY_COLORS = {
    Food:      '#FF6384',
    Transport: '#36A2EB',
    Fun:       '#FFCE56',
  };

  /* ── In-memory state ────────────────────────────────────────────────────── */

  /** Master transaction array — single source of truth for the session. */
  let transactions = [];

  /* ── StorageManager ─────────────────────────────────────────────────────── */

  const StorageManager = {
    /**
     * Reads and parses the transaction list from Local Storage.
     * Returns [] on missing key, parse error, or any other error.
     * Silently discards entries that fail the Transaction shape check.
     *
     * @returns {Transaction[]}
     */
    load() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw === null) return [];

        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];

        return parsed.filter(function (item) {
          return (
            typeof item.id === 'string' && item.id.length > 0 &&
            typeof item.name === 'string' && item.name.length > 0 &&
            typeof item.amount === 'number' &&
            isFinite(item.amount) &&
            item.amount > 0 &&
            VALID_CATEGORIES.indexOf(item.category) !== -1
          );
        });
      } catch (_err) {
        return [];
      }
    },

    /**
     * Serializes and writes the transaction list to Local Storage.
     * Silently swallows QuotaExceededError and SecurityError.
     *
     * @param {Transaction[]} txList
     */
    save(txList) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(txList));
      } catch (err) {
        if (err instanceof DOMException &&
            (err.name === 'QuotaExceededError' ||
             err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
             err.name === 'SecurityError')) {
          console.warn('[StorageManager] Could not persist transactions:', err.name);
        } else {
          throw err;
        }
      }
    },
  };

  /* ── State ──────────────────────────────────────────────────────────────── */

  const State = {
    /**
     * Returns a shallow copy of the transactions array.
     * @returns {Transaction[]}
     */
    getAll() {
      return transactions.slice();
    },

    /**
     * Appends a transaction to the in-memory array.
     * @param {Transaction} tx
     */
    add(tx) {
      transactions.push(tx);
    },

    /**
     * Removes the transaction with the given id from the in-memory array.
     * @param {string} id
     */
    remove(id) {
      transactions = transactions.filter(function (tx) {
        return tx.id !== id;
      });
    },

    /**
     * Returns the sum of all transaction amounts.
     * Returns 0 for an empty transaction list.
     * @returns {number}
     */
    getTotal() {
      return transactions.reduce(function (sum, tx) {
        return sum + tx.amount;
      }, 0);
    },

    /**
     * Returns the total amount spent per category.
     * Categories with no transactions map to 0.
     * @returns {{ Food: number, Transport: number, Fun: number }}
     */
    getTotalByCategory() {
      var totals = { Food: 0, Transport: 0, Fun: 0 };
      transactions.forEach(function (tx) {
        if (Object.prototype.hasOwnProperty.call(totals, tx.category)) {
          totals[tx.category] += tx.amount;
        }
      });
      return totals;
    },
  };

  /* ── Validator ──────────────────────────────────────────────────────────── */

  const Validator = {
    /**
     * Validates the raw form values for a new transaction.
     * All three fields are validated independently — multiple errors can be returned.
     *
     * @param {string} name     - Raw item name from the text input
     * @param {string} amount   - Raw amount string from the number input
     * @param {string} category - Selected category value from the dropdown
     * @returns {{ valid: boolean, errors: { name?: string, amount?: string, category?: string } }}
     */
    validate(name, amount, category) {
      var errors = {};

      if (!name || name.trim() === '') {
        errors.name = 'Item name is required.';
      }

      var parsed = parseFloat(amount);
      if (!isFinite(parsed) || parsed <= 0) {
        errors.amount = 'Amount must be a positive number.';
      }

      if (VALID_CATEGORIES.indexOf(category) === -1) {
        errors.category = 'Please select a category.';
      }

      return {
        valid: Object.keys(errors).length === 0,
        errors: errors,
      };
    },
  };

  /* ── Renderer ───────────────────────────────────────────────────────────── */

  const Renderer = {
    /**
     * Updates the Balance_Display element with the given total formatted to
     * two decimal places, prefixed with a dollar sign (e.g. "$12.50").
     *
     * @param {number} total
     */
    renderBalance(total) {
      var el = document.getElementById('balanceTotal');
      if (el) {
        el.textContent = '$' + total.toFixed(2);
      }
    },

    /**
     * Clears the transaction list container and rebuilds it from the given
     * transactions array. Shows the empty-state placeholder when the array
     * is empty.
     *
     * Each list item contains:
     *   - item name (.transaction-name)
     *   - amount formatted to two decimal places (.transaction-amount)
     *   - category badge (.transaction-badge + .badge-<category>)
     *   - delete button (.btn-delete) with data-id and aria-label
     *
     * @param {Transaction[]} txList
     */
    renderList(txList) {
      var list = document.getElementById('transactionList');
      if (!list) return;

      // Remove all existing children
      while (list.firstChild) {
        list.removeChild(list.firstChild);
      }

      if (!txList || txList.length === 0) {
        this.renderEmptyState();
        return;
      }

      txList.forEach(function (tx) {
        var li = document.createElement('li');
        li.className = 'transaction-item';

        // Item name
        var nameSpan = document.createElement('span');
        nameSpan.className = 'transaction-name';
        nameSpan.textContent = tx.name;

        // Amount formatted to two decimal places
        var amountSpan = document.createElement('span');
        amountSpan.className = 'transaction-amount';
        amountSpan.textContent = '$' + tx.amount.toFixed(2);

        // Category badge — badge class uses lowercase category name
        var badgeSpan = document.createElement('span');
        var categoryLower = tx.category.toLowerCase();
        badgeSpan.className = 'transaction-badge badge-' + categoryLower;
        badgeSpan.textContent = tx.category;

        // Delete button with data-id and accessible label
        var deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'btn-delete';
        deleteBtn.setAttribute('data-id', tx.id);
        deleteBtn.setAttribute('aria-label', 'Delete ' + tx.name);
        deleteBtn.textContent = '×';

        li.appendChild(nameSpan);
        li.appendChild(amountSpan);
        li.appendChild(badgeSpan);
        li.appendChild(deleteBtn);

        list.appendChild(li);
      });
    },

    /**
     * Shows the empty-state placeholder inside the transaction list.
     * Re-creates the #listEmptyState element if it was previously removed.
     */
    renderEmptyState() {
      var list = document.getElementById('transactionList');
      if (!list) return;

      // Re-use existing empty-state element or create a new one
      var emptyState = document.getElementById('listEmptyState');
      if (!emptyState) {
        emptyState = document.createElement('li');
        emptyState.id = 'listEmptyState';
        emptyState.className = 'empty-state';
        emptyState.textContent = 'No expenses recorded yet.';
      }

      list.appendChild(emptyState);
    },

    /**
     * Populates the aria-live error containers adjacent to each form field.
     * Sets each span's textContent to the corresponding error message, or
     * clears it if no error exists for that field.
     *
     * @param {{ name?: string, amount?: string, category?: string }} errors
     */
    renderErrors(errors) {
      var nameError = document.getElementById('itemNameError');
      var amountError = document.getElementById('amountError');
      var categoryError = document.getElementById('categoryError');

      if (nameError) {
        nameError.textContent = (errors && errors.name) ? errors.name : '';
      }
      if (amountError) {
        amountError.textContent = (errors && errors.amount) ? errors.amount : '';
      }
      if (categoryError) {
        categoryError.textContent = (errors && errors.category) ? errors.category : '';
      }
    },

    /**
     * Clears all inline error containers by setting their textContent to
     * an empty string.
     */
    clearErrors() {
      var nameError = document.getElementById('itemNameError');
      var amountError = document.getElementById('amountError');
      var categoryError = document.getElementById('categoryError');

      if (nameError) nameError.textContent = '';
      if (amountError) amountError.textContent = '';
      if (categoryError) categoryError.textContent = '';
    },

    /**
     * Resets all Input_Form fields to their default empty/unselected state.
     * Called after a transaction is successfully added.
     */
    resetForm() {
      var form = document.getElementById('expenseForm');
      if (form) {
        form.reset();
      }
    },
  };

  /* ── ChartManager ───────────────────────────────────────────────────────── */

  var chartInstance = null;

  const ChartManager = {
    /**
     * Initialises the Chart.js pie chart on the given canvas element.
     * If window.Chart is undefined (CDN load failure), displays a static
     * fallback message in the chart container and returns early.
     *
     * @param {HTMLCanvasElement} canvasEl
     */
    init(canvasEl) {
      if (typeof window.Chart === 'undefined') {
        // CDN failed to load — show a fallback message in the chart container
        var container = canvasEl && canvasEl.parentElement;
        if (container) {
          var fallback = document.createElement('p');
          fallback.className = 'chart-empty-state';
          fallback.textContent = 'Chart unavailable — could not load charting library.';
          container.appendChild(fallback);
        }
        return;
      }

      chartInstance = new window.Chart(canvasEl, {
        type: 'pie',
        data: {
          labels: VALID_CATEGORIES,
          datasets: [
            {
              data: [0, 0, 0],
              backgroundColor: [
                CATEGORY_COLORS.Food,
                CATEGORY_COLORS.Transport,
                CATEGORY_COLORS.Fun,
              ],
            },
          ],
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              position: 'bottom',
            },
          },
        },
      });
    },

    /**
     * Updates the pie chart with the latest category totals and toggles the
     * empty state accordingly.
     *
     * If `chartInstance` is null (CDN load failure), this method returns early
     * without throwing.
     *
     * @param {{ Food: number, Transport: number, Fun: number }} categoryTotals
     */
    update(categoryTotals) {
      if (!chartInstance) return;

      chartInstance.data.datasets[0].data = [
        categoryTotals.Food,
        categoryTotals.Transport,
        categoryTotals.Fun,
      ];
      chartInstance.update();

      var allZero =
        categoryTotals.Food === 0 &&
        categoryTotals.Transport === 0 &&
        categoryTotals.Fun === 0;

      if (allZero) {
        this.showEmptyState();
      } else {
        this.hideEmptyState();
      }
    },

    /**
     * Hides the chart canvas and shows the empty-state placeholder paragraph.
     * Called when all category totals are zero (no transactions exist).
     */
    showEmptyState() {
      var canvas = document.getElementById('expenseChart');
      var emptyState = document.getElementById('chartEmptyState');
      if (canvas) canvas.style.display = 'none';
      if (emptyState) emptyState.style.display = 'block';
    },

    /**
     * Shows the chart canvas and hides the empty-state placeholder paragraph.
     * Called when at least one category has a non-zero total.
     */
    hideEmptyState() {
      var canvas = document.getElementById('expenseChart');
      var emptyState = document.getElementById('chartEmptyState');
      if (canvas) canvas.style.display = 'block';
      if (emptyState) emptyState.style.display = 'none';
    },
  };

  /* ── EventHandlers ──────────────────────────────────────────────────────── */

  const EventHandlers = {
    /**
     * Handles the expense form's submit event.
     * Validates the form fields, and on success builds a Transaction object,
     * persists it, and updates all UI components.
     *
     * @param {Event} event
     */
    onFormSubmit(event) {
      event.preventDefault();

      // Read raw values from the form fields
      var name     = document.getElementById('itemName').value;
      var amount   = document.getElementById('amount').value;
      var category = document.getElementById('category').value;

      // Clear any previously displayed errors before re-validating
      Renderer.clearErrors();

      // Validate the raw form values
      var result = Validator.validate(name, amount, category);

      if (!result.valid) {
        Renderer.renderErrors(result.errors);
        return;
      }

      // Build a new Transaction object
      var tx = {
        id:        crypto.randomUUID(),
        name:      name.trim(),
        amount:    parseFloat(amount),
        category:  category,
        createdAt: new Date().toISOString(),
      };

      // Update state, persist, and refresh all UI components
      State.add(tx);
      StorageManager.save(State.getAll());
      Renderer.renderList(State.getAll());
      Renderer.renderBalance(State.getTotal());
      ChartManager.update(State.getTotalByCategory());
      Renderer.resetForm();
    },

    /**
     * Handles click events on the Transaction_List container using event
     * delegation. Finds the nearest delete button ancestor of the clicked
     * element, reads its `data-id` attribute, and removes the corresponding
     * transaction from state, storage, and all UI components.
     *
     * @param {MouseEvent} event
     */
    onDeleteClick(event) {
      var btn = event.target.closest('.btn-delete');
      if (!btn) return;

      var id = btn.getAttribute('data-id');
      if (!id) return;

      State.remove(id);
      StorageManager.save(State.getAll());
      Renderer.renderList(State.getAll());
      Renderer.renderBalance(State.getTotal());
      ChartManager.update(State.getTotalByCategory());
    },
  };

  /* ── Bootstrap ──────────────────────────────────────────────────────────── */

  /**
   * Initialises the application: loads persisted transactions, renders all UI
   * components, and attaches event listeners.
   */
  function init() {
    // Restore persisted transactions into the in-memory state array
    transactions = StorageManager.load();

    // Initialise the Chart.js pie chart on the canvas element
    ChartManager.init(document.getElementById('expenseChart'));

    // Render the initial UI state from the loaded transactions
    Renderer.renderList(State.getAll());
    Renderer.renderBalance(State.getTotal());
    ChartManager.update(State.getTotalByCategory());

    // Attach form submit handler
    var form = document.getElementById('expenseForm');
    if (form) {
      form.addEventListener('submit', EventHandlers.onFormSubmit);
    }

    // Attach delete click handler (event delegation on the list container)
    var list = document.getElementById('transactionList');
    if (list) {
      list.addEventListener('click', EventHandlers.onDeleteClick);
    }
  }

  init();

})();
