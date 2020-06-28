import { Component } from '@angular/core';

@Component({
    selector: 'app-main',
    template: `
        <div #wrapper class="full-size">
            <canvas #canvas oncontextmenu="return false"></canvas>
        </div>
        <div class="full-size">
            <app-main-settings></app-main-settings>
            <router-outlet></router-outlet>            
        </div>
    `,
    styleUrls: ['./main.component.scss']
})
export class MainComponent {

}
