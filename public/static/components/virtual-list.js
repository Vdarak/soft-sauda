/**
 * Reusable High-Performance Virtual List (DOM Windowing)
 * Renders only the visible rows (~25-35 DOM elements) inside the scroll viewport,
 * enabling smooth 60 FPS scrolling and instant responsiveness across 10,000+ records.
 */

export class VirtualList {
  constructor({
    container,
    itemHeight = 48,
    buffer = 6,
    items = [],
    selectedId = null,
    getItemId = (item) => item.id,
    renderItem,
    onSelect,
    emptyMessage = 'No records found.'
  }) {
    if (!container) throw new Error('VirtualList requires a container element');
    this.container = container;
    this.itemHeight = itemHeight;
    this.buffer = buffer;
    this.items = items;
    this.selectedId = selectedId;
    this.getItemId = getItemId;
    this.renderItem = renderItem;
    this.onSelect = onSelect;
    this.emptyMessage = emptyMessage;

    this.visibleStartIndex = -1;
    this.visibleEndIndex = -1;
    this.scrollTicking = false;

    this.initDOM();
    this.attachEvents();
    this.render(true);
  }

  initDOM() {
    this.container.style.position = 'relative';
    this.container.style.overflowY = 'auto';

    this.container.innerHTML = `
      <div class="vl-spacer" style="height: 0px; width: 100%; pointer-events: none;"></div>
      <div class="vl-content" style="position: absolute; top: 0; left: 0; right: 0; pointer-events: auto;"></div>
    `;

    this.spacer = this.container.querySelector('.vl-spacer');
    this.content = this.container.querySelector('.vl-content');
  }

  attachEvents() {
    // 60 FPS throttled scroll listener
    this.scrollHandler = () => {
      if (!this.scrollTicking) {
        window.requestAnimationFrame(() => {
          this.render();
          this.scrollTicking = false;
        });
        this.scrollTicking = true;
      }
    };
    this.container.addEventListener('scroll', this.scrollHandler, { passive: true });

    // Single event delegation click listener
    this.clickHandler = (e) => {
      const itemEl = e.target.closest('.split-pane-list-item');
      if (itemEl && this.onSelect) {
        const id = itemEl.getAttribute('data-id');
        const item = this.items.find(it => String(this.getItemId(it)) === String(id));
        this.onSelect(id, item);
      }
    };
    this.content.addEventListener('click', this.clickHandler);
  }

  setItems(newItems, resetScroll = false) {
    this.items = newItems || [];
    if (resetScroll) {
      this.container.scrollTop = 0;
    }
    this.render(true);
  }

  setSelectedId(id) {
    this.selectedId = id;
    // Fast path: toggle class in visible DOM nodes without rebuilding
    let found = false;
    this.content.querySelectorAll('.split-pane-list-item').forEach(el => {
      const elId = el.getAttribute('data-id');
      if (String(elId) === String(id)) {
        el.classList.add('selected');
        found = true;
      } else {
        el.classList.remove('selected');
      }
    });

    if (!found) {
      this.render(true);
    }
  }

  getSelectedId() {
    return this.selectedId;
  }

  scrollToId(id) {
    const idx = this.items.findIndex(it => String(this.getItemId(it)) === String(id));
    if (idx !== -1) {
      const viewportHeight = this.container.clientHeight || 400;
      const targetScroll = Math.max(0, (idx * this.itemHeight) - (viewportHeight / 2) + (this.itemHeight / 2));
      this.container.scrollTop = targetScroll;
      this.render(true);
    }
  }

  render(force = false) {
    if (!this.container || !this.spacer || !this.content) return;

    const total = this.items.length;
    this.spacer.style.height = `${total * this.itemHeight}px`;

    if (total === 0) {
      this.content.style.transform = 'translateY(0px)';
      this.content.innerHTML = `
        <div style="padding: 1.5rem; text-align: center; color: var(--muted-foreground); font-size: 0.8rem;">
          ${this.emptyMessage}
        </div>
      `;
      this.visibleStartIndex = -1;
      this.visibleEndIndex = -1;
      return;
    }

    const scrollTop = this.container.scrollTop;
    const viewportHeight = this.container.clientHeight || 500;

    const rawStart = Math.floor(scrollTop / this.itemHeight);
    const rawEnd = Math.ceil((scrollTop + viewportHeight) / this.itemHeight);

    const startIndex = Math.max(0, rawStart - this.buffer);
    const endIndex = Math.min(total, rawEnd + this.buffer);

    if (!force && startIndex === this.visibleStartIndex && endIndex === this.visibleEndIndex) {
      return;
    }

    this.visibleStartIndex = startIndex;
    this.visibleEndIndex = endIndex;

    const slice = this.items.slice(startIndex, endIndex);
    this.content.style.transform = `translateY(${startIndex * this.itemHeight}px)`;

    this.content.innerHTML = slice.map(item => {
      const isSelected = String(this.getItemId(item)) === String(this.selectedId);
      return this.renderItem(item, isSelected);
    }).join('');
  }

  destroy() {
    if (this.container && this.scrollHandler) {
      this.container.removeEventListener('scroll', this.scrollHandler);
    }
    if (this.content && this.clickHandler) {
      this.content.removeEventListener('click', this.clickHandler);
    }
  }
}
