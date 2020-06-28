import { Component } from '@angular/core';

@Component({
    selector: 'app-main-settings',
    template: `
        <div class="main-settings">
            <div class="main-settings-icon-wrapper">
                <mat-icon class="main-icon" (click)="settingsVisible = !settingsVisible">settings</mat-icon>
            </div>

            <ng-container *ngIf="settingsVisible">
                <mat-expansion-panel>
                    <mat-expansion-panel-header>
                        <mat-panel-title>Performance Info</mat-panel-title>
                    </mat-expansion-panel-header>
                    <div class="main-info-table">
                        <span>FPS</span>
                        <span></span>
                        <span>Points</span>
                        <span>45,125,456</span>
                        <span>Nodes</span>
                        <span></span>
                    </div>
                </mat-expansion-panel>

                <mat-expansion-panel>
                    <mat-expansion-panel-header>
                        <mat-panel-title>Main settings</mat-panel-title>
                    </mat-expansion-panel-header>
                    some settings here
                </mat-expansion-panel>

                <mat-expansion-panel>
                    <mat-expansion-panel-header>
                        <mat-panel-title>Advanced</mat-panel-title>
                    </mat-expansion-panel-header>
                    advanced settings here
                </mat-expansion-panel>

            </ng-container>

        </div>
    `,
    styleUrls: ['./main-settings.component.scss']
})
export class MainSettingsComponent {

    settingsVisible = false;

}
