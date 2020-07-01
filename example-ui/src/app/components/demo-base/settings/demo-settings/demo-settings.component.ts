import { Component } from '@angular/core';

@Component({
    selector: 'app-demo-settings',
    template: `
        <div class="demo-settings">
            <div>
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

}
