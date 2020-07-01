import { Component, OnDestroy } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatSelectChange } from '@angular/material/select';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { RendererService } from '../../services/renderer.service';

import { DynamicStreetViewController, LocalStreetViewApi, Renderer, StreetViewLoader } from 'web-surfels';

@Component({
    selector: 'app-street-view-demo',
    template: `
        <mat-expansion-panel>
            <mat-expansion-panel-header>
                <mat-panel-title>About Street View</mat-panel-title>
            </mat-expansion-panel-header>
            <div>
                Reconstructing urban environments from Google Street View panoramas.
                The demo loads panorama data, constructs local point sets and aligns them into a global point cloud.
            </div>
        </mat-expansion-panel>

        <mat-expansion-panel *ngIf="controller.errorLoadingRoot" [expanded]="true">
            <mat-expansion-panel-header>
                <mat-panel-title>Initialization Error!</mat-panel-title>
            </mat-expansion-panel-header>
            <div>
                Something went wrong with loading the root panorama.
                Try reloading the page.
            </div>
        </mat-expansion-panel>

        <mat-expansion-panel *ngIf="!controller.errorLoadingRoot">
            <mat-expansion-panel-header>
                <mat-panel-title>Settings</mat-panel-title>
            </mat-expansion-panel-header>

            <mat-slide-toggle
                    style="margin-bottom: 10px"
                    [color]="'primary'"
                    [checked]="!controller.pauseLoading"
                    (change)="controller.pauseLoading = !$event.checked"
            >Enable loading
            </mat-slide-toggle>

            <div matTooltip="Highest quality will be chosen for panoramas within this distance.
                             More distant panoramas are rendered in lower quality.
                             Also affects the radius within new panoramas must be loaded.">
                Quality distance:
                <mat-slider
                        style="width: 100%"
                        [value]="controller.qualityDist"
                        [color]="'primary'" [min]="20" [max]="150" [step]="10"
                        [tickInterval]="10" thumbLabel
                        (input)="controller.qualityDist = $event.value"
                ></mat-slider>
            </div>

            <div>
                <mat-form-field>
                    <mat-label>Memory Limits</mat-label>
                    <mat-select [formControl]="memoryLimitControl" (selectionChange)="memoryLimitChange($event)">
                        <mat-option *ngFor="let limit of memoryLimits"
                                    [value]="limit.text">
                            {{limit.text}}
                        </mat-option>
                    </mat-select>
                </mat-form-field>
                <div>
                    Point budget: {{controller.pointLoadingBudgets.softMinimum / 1e6}}
                    - {{controller.pointLoadingBudgets.softMaximum / 1e6}} million.
                </div>
                <div *ngIf="!moreAboutPointLoading">
                    <div class="more-info-link" (click)="moreAboutPointLoading = true">more...</div>
                </div>
                <div *ngIf="moreAboutPointLoading" style="margin-top: 5px; color: #737373">
                    Load panoramas until at least {{controller.pointLoadingBudgets.softMinimum / 1e6}}
                    million points are in memory. Remove the most distant panoramas when there are more than
                    {{controller.pointLoadingBudgets.softMaximum / 1e6}} million points.
                    Always load panoramas next to the current camera position (might even exceed the point budget).
                    <div class="more-info-link" (click)="moreAboutPointLoading = false">less...</div>
                </div>

            </div>
        </mat-expansion-panel>

        <mat-expansion-panel *ngIf="!controller.errorLoadingRoot" [expanded]="true">
            <mat-expansion-panel-header>
                <mat-panel-title>Controller</mat-panel-title>
            </mat-expansion-panel-header>

            <mat-radio-group [formControl]="controlModeControl" (change)="rendererService.setControlMode($event.value)">
                <mat-radio-button value="first-person">First-person (WASD)</mat-radio-button><br>
                <mat-radio-button value="orbit-animation">Orbit animation</mat-radio-button>
            </mat-radio-group>

            <div *ngIf="controlModeControl.value === 'first-person'" style="margin-top: 5px">
                Movement speed: {{rendererService.getMovementSpeed().toLocaleString('en-us')}}<br>
                <span style="color: gray">
                    Change movement speed with the mouse scroll wheel. 
                </span>
            </div>
        </mat-expansion-panel>

        <mat-expansion-panel *ngIf="controller.hasNetworkErrors()" [expanded]="true">
            <mat-expansion-panel-header>
                <mat-panel-title>Network Errors!</mat-panel-title>
            </mat-expansion-panel-header>
            <div>
                <span style="color: red">
                    There are network errors! Is the server connection fine and all required data available?    
                </span>
                <button mat-raised-button color="warn" style="width: 100%"
                        (click)="controller.forgetPreviousNetworkErrors()"
                >Forget Errors & Retry
                </button>
            </div>
        </mat-expansion-panel>
    `,
    styleUrls: ['./street-view-demo.component.scss']
})
export class StreetViewDemoComponent implements OnDestroy {

    private readonly renderer: Renderer;
    private destroyed$: Subject<void> = new Subject();

    controller: DynamicStreetViewController;
    moreAboutPointLoading = false;

    datasets = {
        paris25k: {
            path: 'paris25k',
            startID: 'PxH7e1kCSV7p728tziDR_w'
        },
        paris5k: {
            path: 'paris5k',
            startID: 'LeNISulEnNszX0Mm91hi9A'
        },
        manhattan25k: {
            path: 'manhattan25k',
            startID: 'jdYd3nY9wyIGeb8l_zAYBA',
        },
        munich25k: {
            path: 'munich25k',
            startID: '92II9-zwofQNOu_3uN-yAg',
        }
    };

    memoryLimits: Array<{ text: string, min: number, max: number }> = [
        {text: 'Low', min: 5e6, max: 10e6},
        {text: 'Medium', min: 25e6, max: 50e6},
        {text: 'High', min: 50e6, max: 100e6},
        {text: 'Extra High', min: 100e6, max: 120e6},
    ];
    memoryLimitControl = new FormControl();
    controlModeControl = new FormControl();

    constructor(public rendererService: RendererService) {
        this.rendererService.setFpsAveragingWindow(20);
        this.rendererService.setControlMode('orbit-animation');
        this.controlModeControl.patchValue('orbit-animation');
        this.rendererService.setMovementSpeed(0.5);

        this.renderer = this.rendererService.getRenderer();
        this.renderer.camera.setClippingDist(0.1, 10000);
        this.rendererService.setOrbitAnimation(30, 100, 30, 50000);

        this.renderer.light.ambientIntensity = 1;

        const data = this.datasets.paris5k; // environment.production ? this.datasets.paris5k : this.datasets.paris25k;
        const baseURL = (!environment.production ? 'http://localhost:5000' : '') + '/gsv/';

        // const api = new GoogleStreetViewApi();
        const api = new LocalStreetViewApi(baseURL + data.path);
        const loader = new StreetViewLoader(api, 0.4, 1.5);
        this.controller = new DynamicStreetViewController(this.renderer, loader, 50, {
            softMinimum: 10_000_000,
            softMaximum: 50_000_000
        }, data.startID);

        this.rendererService.nextFrame.pipe(takeUntil(this.destroyed$)).subscribe(() => {
            this.controller.render();
        });

        setTimeout(() => {
            const selectedLimit = this.memoryLimits[0];
            this.memoryLimitControl.patchValue(selectedLimit.text);
            this.controller.pointLoadingBudgets.softMinimum = selectedLimit.min;
            this.controller.pointLoadingBudgets.softMaximum = selectedLimit.max;
        }, 0);
    }

    ngOnDestroy(): void {
        this.controller.destroy();
        this.renderer.removeAllNodes();
        this.renderer.render();
        this.destroyed$.next();
        this.destroyed$.complete();
    }

    memoryLimitChange(e: MatSelectChange) {
        const selectedLimit = this.memoryLimits.find(l => l.text === e.value) || this.memoryLimits[0];
        this.controller.pointLoadingBudgets.softMinimum = selectedLimit.min;
        this.controller.pointLoadingBudgets.softMaximum = selectedLimit.max;
    }

}
