import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
    selector: 'app-demo-settings',
    template: `
        <div class="demo-settings">
            <div>
                <mat-icon class="main-icon" (click)="goHome()">home</mat-icon>
                <mat-icon class="main-icon" (click)="demoSettingsVisible = !demoSettingsVisible">grade</mat-icon>
            </div>
            <ng-container *ngIf="demoSettingsVisible">
                <ng-content></ng-content>
            </ng-container>          
        </div>
    `,
    styleUrls: ['./demo-settings.component.scss']
})
export class DemoSettingsComponent {

    demoSettingsVisible = true;

    constructor(private router: Router) {

    }

    goHome() {
        this.router.navigate(['../../']);
    }

}
