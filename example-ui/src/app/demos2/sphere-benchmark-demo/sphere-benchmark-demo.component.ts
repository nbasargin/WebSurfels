import { AfterViewInit, Component, OnDestroy } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatSelectChange } from '@angular/material/select';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { RendererService } from '../../services/renderer.service';

import { DummyData, Renderer } from 'web-surfels';

@Component({
    selector: 'app-sphere-benchmark-demo',
    template: `
        <mat-expansion-panel>
            <mat-expansion-panel-header>
                <mat-panel-title>About this demo</mat-panel-title>
            </mat-expansion-panel-header>
            <div>
                Sphere Benchmark
            </div>
        </mat-expansion-panel>

        <mat-expansion-panel>
            <mat-expansion-panel-header>
                <mat-panel-title>Settings</mat-panel-title>
            </mat-expansion-panel-header>

            <mat-form-field>
                <mat-label>Camera Position</mat-label>
                <mat-select [formControl]="camPositionControl" (selectionChange)="camPosChange($event)">
                    <mat-option *ngFor="let position of camPositions"
                                [value]="position.text">
                        {{position.text}}
                    </mat-option>
                </mat-select>
            </mat-form-field>

            <mat-form-field>
                <mat-label>Number of points</mat-label>
                <mat-select [formControl]="pointNumberControl" (selectionChange)="pointNumberChange($event)">
                    <mat-option *ngFor="let preset of pointPresets"
                                [value]="preset.points">
                        {{preset.points.toLocaleString()}}
                    </mat-option>
                </mat-select>
            </mat-form-field>
        </mat-expansion-panel>
    `,
    styleUrls: ['./sphere-benchmark-demo.component.scss']
})
export class SphereBenchmarkDemoComponent implements AfterViewInit, OnDestroy {

    private renderer: Renderer;
    private destroyed$: Subject<void> = new Subject();

    pointPresets: Array<{ points: number, size: number }>;
    camPositions: Array<{ pos: Array<number>, text: string }>;

    camPositionControl = new FormControl();
    pointNumberControl = new FormControl();

    constructor(private rendererService: RendererService) {
        // sphere surface = 4 pi R^2 = 4 pi    (R = 1 here)
        // Goal: N * splat area = 4 * sphere surface
        // N * pi * (splat size / 2)^2 = 4 * 4 pi
        // N * splat size^2 / 4 = 4 * 4
        // splat size = sqrt(4 * 4 * 4 / N) = 8 sqrt (1 / N)
        this.pointPresets = [10_000, 100_000, 1_000_000, 10_000_000].map(n => ({
            points: n,
            size: 8 * Math.sqrt(1 / n)
        }));

        this.camPositions = [
            {text: 'Near', pos: [-1.25, 0, 0]},
            {text: 'Far', pos: [-2.1, 0, 0]},
        ];
    }

    ngAfterViewInit(): void {
        this.renderer = this.rendererService.getRenderer();
        const selectedPos = this.camPositions[1];
        const selectedPoints = this.pointPresets[1];
        this.setCam(selectedPos.pos);
        this.addSphere(selectedPoints);

        setTimeout(() => {
            this.camPositionControl.patchValue(selectedPos.text);
            this.pointNumberControl.patchValue(selectedPoints.points);
        }, 0);

        this.rendererService.setFpsAveragingWindow(100);
        this.rendererService.setControlMode('first-person');
        this.rendererService.setMovementSpeed(0.05);

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
