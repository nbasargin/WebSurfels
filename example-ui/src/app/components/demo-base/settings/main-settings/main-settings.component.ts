import { Component } from '@angular/core';
import { Renderer } from 'web-surfels';
import { RendererService } from '../../../../services/renderer.service';

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
                        <span>{{rendererService.fps.toLocaleString('en-us')}}</span>
                        <span>Points</span>
                        <span>{{renderer.stats.pointsDrawn.toLocaleString('en-us')}}</span>
                        <span>Nodes</span>
                        <span>{{renderer.stats.nodesDrawn.toLocaleString('en-us')}}</span>
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
    renderer: Renderer;

    constructor(public rendererService: RendererService) {
        this.renderer = rendererService.getRenderer();
    }

}
