import { Component, OnDestroy } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatSelectChange } from '@angular/material/select';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ControlMode, RendererService } from '../../services/renderer.service';

import { DummyData, Renderer } from 'web-surfels';

@Component({
    selector: 'app-sphere-benchmark-demo',
    template: `
        <mat-expansion-panel>
            <mat-expansion-panel-header>
                <mat-panel-title>About Sphere Demo</mat-panel-title>
            </mat-expansion-panel-header>
            <p>
                Use this demo to benchmark and evaluate the limits of rendering performance.
            </p>
            <p>
                All points are placed in a single renderer node to reduce the number of draw calls.
            </p>
        </mat-expansion-panel>

        <mat-expansion-panel>
            <mat-expansion-panel-header>
                <mat-panel-title>Point Number</mat-panel-title>
            </mat-expansion-panel-header>

            <mat-form-field style="width: 100%">
                <mat-label>Set the number of rendered points</mat-label>
                <mat-select [formControl]="pointNumberControl" (selectionChange)="pointNumberChange($event)">
                    <mat-option *ngFor="let preset of pointPresets"
                                [value]="preset.points">
                        {{preset.points.toLocaleString()}}
                    </mat-option>
                </mat-select>
            </mat-form-field>
        </mat-expansion-panel>

        <mat-expansion-panel [expanded]="true">
            <mat-expansion-panel-header>
                <mat-panel-title>Camera</mat-panel-title>
            </mat-expansion-panel-header>

            <mat-radio-group [formControl]="controlModeControl" (change)="setCamControl($event.value)">
                <mat-radio-button value="first-person">First-person (WASD)</mat-radio-button><br>
                <mat-radio-button value="orbit-animation">Orbit animation</mat-radio-button><br>
                <mat-radio-button value="far">Far View</mat-radio-button><br>
                <mat-radio-button value="near">Near View</mat-radio-button>
            </mat-radio-group>

            <div *ngIf="controlModeControl.value === 'first-person'" style="margin-top: 5px">
                Movement speed: {{rendererService.getMovementSpeed().toLocaleString('en-us')}}<br>
                <span style="color: gray">
                    Change movement speed with the mouse scroll wheel. 
                </span>
            </div>
        </mat-expansion-panel>
    `,
    styleUrls: ['./sphere-benchmark-demo.component.scss']
})
export class SphereBenchmarkDemoComponent implements OnDestroy {

    private renderer: Renderer;
    private destroyed$: Subject<void> = new Subject();

    pointPresets: Array<{ points: number, size: number }>;
    camPositions: Array<{ pos: Array<number>, text: string }>;

    camPositionControl = new FormControl();
    pointNumberControl = new FormControl();
    controlModeControl = new FormControl();

    constructor(public rendererService: RendererService) {
        // sphere surface = 4 pi R^2 = 4 pi    (R = 1 here)
        // Goal: N * splat area = 4 * sphere surface
        // N * pi * (splat size / 2)^2 = 4 * 4 pi
        // N * splat size^2 / 4 = 4 * 4
        // splat size = sqrt(4 * 4 * 4 / N) = 8 sqrt (1 / N)
        this.pointPresets = [10_000, 50_000, 100_000, 500_000, 1_000_000, 5_000_000, 10_000_000].map(n => ({
            points: n,
            size: 8 * Math.sqrt(1 / n)
        }));

        this.camPositions = [
            {text: 'Near', pos: [-1.25, 0, 0]},
            {text: 'Far', pos: []},
        ];

        this.renderer = this.rendererService.getRenderer();
        const selectedPos = this.camPositions[1];
        const selectedPoints = this.pointPresets[2];
        this.setCam(selectedPos.pos);
        this.addSphere(selectedPoints);

        setTimeout(() => {
            this.camPositionControl.patchValue(selectedPos.text);
            this.pointNumberControl.patchValue(selectedPoints.points);
        }, 0);

        this.rendererService.setFpsAveragingWindow(20);
        this.rendererService.setControlMode('orbit-animation');
        this.controlModeControl.patchValue('orbit-animation');
        this.rendererService.setMovementSpeed(0.05);
        this.renderer.camera.setClippingDist(0.1, 10000);
        this.rendererService.setOrbitAnimation(2.2, 3, 0, 25000);

        this.rendererService.nextFrame.pipe(takeUntil(this.destroyed$)).subscribe(() => {
            this.renderer.render();
        });
    }

    ngOnDestroy(): void {
        this.renderer.removeAllNodes();
        this.renderer.render();
        this.destroyed$.next();
        this.destroyed$.complete();
    }

    camPosChange(e: MatSelectChange) {
        const selectedPos = this.camPositions.find(pos => pos.text === e.value) || this.camPositions[0];
        this.setCam(selectedPos.pos);
    }

    setCam(pos: Array<number>) {
        this.renderer.camera.setOrientation(pos, [0,0,0], [0,0,-1]);
    }

    setCamControl(mode: 'near' | 'far' | ControlMode) {
        switch (mode) {
            case 'near':
                this.setCam([-1.25, 0, 0]);
                mode = 'disabled';
                break;
            case 'far':
                this.setCam([-2.1, 0, 0]);
                mode = 'disabled';
                break;
        }
        this.rendererService.setControlMode(mode);
    }

    pointNumberChange(e: MatSelectChange) {
        const selectedPreset = this.pointPresets.find(p => p.points === e.value) || this.pointPresets[0];
        setTimeout(() => {
            this.addSphere(selectedPreset);
        }, 10);
    }

    addSphere(preset: { points: number, size: number }) {
        this.renderer.removeAllNodes();
        const data = DummyData.generateSphere(preset.points, preset.size);
        this.renderer.addData(data);
    }

}
