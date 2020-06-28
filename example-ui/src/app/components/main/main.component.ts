import { Component } from '@angular/core';

@Component({
    selector: 'app-main',
    template: `
        <p>main works!</p>
        <router-outlet></router-outlet>
    `,
    styleUrls: ['./main.component.scss']
})
export class MainComponent {

}
