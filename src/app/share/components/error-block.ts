import { Component, input } from '@angular/core';

@Component({
  selector: 'app-error-block',
  host: { class: 'block' },
  template: `
    <div class="rounded-xl border p-6 text-center error-block">
      <p class="mb-4 error-text">{{ message() }}</p>
      <ng-content />
    </div>
  `,
})
export class ErrorBlockComponent {
  message = input.required<string>();
}
