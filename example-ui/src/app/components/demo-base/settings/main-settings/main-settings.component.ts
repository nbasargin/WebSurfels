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
                    <div *ngIf="!morePerfData" class="main-info-table">
                        <span>FPS</span><span>{{rendererService.fps.toLocaleString('en-us')}}</span>
                        <span>Points</span><span>{{renderer.stats.pointsDrawn.toLocaleString('en-us')}}</span>
                        <span>Nodes</span><span>{{renderer.stats.nodesDrawn.toLocaleString('en-us')}}</span>                                               
                        <span></span><span class="more-less-perf" (click)="morePerfData = true">more...</span>
                    </div>
                    <div *ngIf="morePerfData" class="main-info-table">
                        <span>FPS</span><span>{{rendererService.fps.toLocaleString('en-us')}}</span>
                        <span>Points</span><span></span>
                        <span>... rendered</span><span>{{renderer.stats.pointsDrawn.toLocaleString('en-us')}}</span>
                        <span>... loaded</span><span>{{renderer.stats.pointsLoaded.toLocaleString('en-us')}}</span>
                        <span>Nodes</span><span></span>
                        <span>... rendered</span><span>{{renderer.stats.nodesDrawn.toLocaleString('en-us')}}</span>
                        <span>... loaded</span><span>{{renderer.stats.nodesLoaded.toLocaleString('en-us')}}</span>
                        <span>Canvas</span><span>{{renderer.canvas.width}} x {{renderer.canvas.height}}</span>
                        <span></span><span class="more-less-perf" (click)="morePerfData = false">less...</span>
                    </div>
                </mat-expansion-panel>

                <mat-expansion-panel>
                    <mat-expansion-panel-header>
                        <mat-panel-title>Main settings</mat-panel-title>
                    </mat-expansion-panel-header>

                    <mat-slide-toggle 
                            [color]="'primary'"
                            [checked]="renderer.options.highQuality" 
                            (change)="renderer.options.highQuality = $event.checked"
                    >High-quality splats</mat-slide-toggle>

                    <mat-slide-toggle
                            [color]="'primary'"
                            [checked]="renderer.options.backfaceCulling"
                            (change)="renderer.options.backfaceCulling = $event.checked"
                    >Backface culling</mat-slide-toggle>

                    <mat-slide-toggle
                            [color]="'primary'"
                            [checked]="renderer.light.headlight"
                            (change)="renderer.light.headlight = $event.checked"
                    >Enable headlight</mat-slide-toggle>                    
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
    morePerfData = false;

    renderer: Renderer;

    constructor(public rendererService: RendererService) {
        this.renderer = rendererService.getRenderer();
    }

}
