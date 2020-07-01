import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
    selector: 'app-demo-base',
    template: `
        <div class="full-size">
            <app-main-settings></app-main-settings>
            <app-demo-settings>
                <router-outlet></router-outlet>
            </app-demo-settings>
            <div class="go-home-icon">
                <mat-icon class="main-icon" (click)="goHome()">home</mat-icon>
            </div>
        </div>
    `,
    styleUrls: ['./demo-base.component.scss']
})
export class DemoBaseComponent {

    constructor(private router: Router) {

    }

    goHome() {
        this.router.navigate(['../../']);
    }

}
