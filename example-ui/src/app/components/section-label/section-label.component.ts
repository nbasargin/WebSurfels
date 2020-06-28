import { Component, Input } from '@angular/core';

@Component({
    selector: 'app-section-label',
    template: `
        <div class="section-label">
            <span class="text">{{label}}</span>
            <span class="line"></span>
        </div>
    `,
    styleUrls: ['./section-label.component.scss']
})
export class SectionLabelComponent {

    @Input() label: string = '';

}
