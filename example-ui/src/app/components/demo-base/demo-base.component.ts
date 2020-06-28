import { Component } from '@angular/core';

@Component({
    selector: 'app-demo-base',
    template: `
        <div class="full-size">
            <app-main-settings></app-main-settings>
            <app-demo-settings>
                <router-outlet></router-outlet>
            </app-demo-settings>
        </div>
    `,
    styleUrls: ['./demo-base.component.scss']
})
export class DemoBaseComponent {

}
