import { Component } from '@angular/core';

@Component({
    selector: 'app-main',
    template: `
        <div #wrapper class="full-size">
            <canvas #canvas oncontextmenu="return false"></canvas>
        </div>
        <router-outlet></router-outlet>        
    `,
    styleUrls: ['./main.component.scss']
})
export class MainComponent {

}
