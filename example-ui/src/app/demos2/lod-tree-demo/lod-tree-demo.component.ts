import { Component, OnDestroy } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Benchmark } from '../../benchmarks/benchmark';
import { CameraPath } from '../../benchmarks/camera-path';
import { ControlMode, RendererService } from '../../services/renderer.service';

import { vec3, DynamicLodController, Renderer, XhrLodLoader } from 'web-surfels';

@Component({
    selector: 'app-lod-tree-demo',
    template: `
        <mat-expansion-panel>
            <mat-expansion-panel-header>
                <mat-panel-title>About LOD Tree Demo</mat-panel-title>
            </mat-expansion-panel-header>
            <p>
                This demo renders a LOD tree created from a large dataset with more than 30 million of points.
            </p>
            <p>
                Data preprocessing is done on the server.
                The resulting LOD nodes are streamed to the browser depending on the camera position and the selected quality.
            </p>            
            <p>
                Data credit:
                <a href="https://www.in.tum.de/">TUM Department of Informatics</a>
            </p>
        </mat-expansion-panel>

        <mat-expansion-panel *ngIf="dynamicLod.errorLoadingRoot" [expanded]="true">
            <mat-expansion-panel-header>
                <mat-panel-title>Initialization Error!</mat-panel-title>
            </mat-expansion-panel-header>
            <span style="color: red">
                Something went wrong with loading the root node.
                Try reloading the page.
            </span>
        </mat-expansion-panel>

        <mat-expansion-panel *ngIf="!dynamicLod.errorLoadingRoot">
            <mat-expansion-panel-header>
                <mat-panel-title>Loading Preferences</mat-panel-title>
            </mat-expansion-panel-header>

            <div>
                Node size threshold for rendering:
                <mat-slider style="width: 100%"
                            [value]="dynamicLod.sizeThreshold"
                            [color]="'primary'" [max]="3.1" [min]="0.1" [step]="0.1"
                            [tickInterval]="5" thumbLabel
                            (input)="dynamicLod.sizeThreshold = $event.value"
                ></mat-slider>
                Higher threshold accepts larger and less detailed nodes, increases performance and reduces quality.
            </div>
        </mat-expansion-panel>

        <mat-expansion-panel *ngIf="!dynamicLod.errorLoadingRoot" [expanded]="true">
            <mat-expansion-panel-header>
                <mat-panel-title>Camera</mat-panel-title>
            </mat-expansion-panel-header>

            <mat-radio-group [formControl]="controlModeControl" (change)="setControlMode($event.value)">
                <mat-radio-button value="first-person">First-person (WASD)</mat-radio-button><br>
                <mat-radio-button value="orbit-animation">Orbit animation</mat-radio-button><br>
                <mat-radio-button value="disabled">Benchmark</mat-radio-button>
            </mat-radio-group>
            
            <div *ngIf="controlModeControl.value === 'first-person'" style="margin-top: 5px">
                Movement speed: {{rendererService.getMovementSpeed().toLocaleString('en-us')}}<br>
                <span style="color: gray">
                    Change movement speed with the mouse scroll wheel. 
                </span>
            </div>

        </mat-expansion-panel>

        <mat-expansion-panel *ngIf="!dynamicLod.errorLoadingRoot && controlModeControl.value === 'disabled'" [expanded]="true">
            <mat-expansion-panel-header>
                <mat-panel-title>Benchmark</mat-panel-title>
            </mat-expansion-panel-header>
            
            <div>
                {{benchmark.running ? 'Benchmark Progress:' : 'Camera path preview:'}}                     
                <mat-slider style="width: 100%"
                            [disabled]="benchmark.running"
                            [value]="benchmark.getProgress()"
                            [color]="'primary'" [min]="0" [max]="benchmark.cameraPath.points.length" [step]="0.1"
                            [tickInterval]="10" thumbLabel
                            (input)="setCamPos($event.value)"
                ></mat-slider>
            </div>

            <button mat-raised-button color="primary" style="width: 100%; margin-bottom: 3px"
                    *ngIf="benchmark.data && !benchmark.running"
                    (click)="benchmark.exportBenchmarkResults()"
            >Export results</button>
            
            <button mat-raised-button color="primary" style="width: 100%; margin-bottom: 3px"
                    *ngIf="!benchmark.running"
                    (click)="benchmark.startBenchmark()"
            >{{benchmark.data ? 'Restart' : 'Start'}} Benchmark</button>
            
            <button mat-raised-button color="warn" style="width: 100%; margin-bottom: 3px"
                    *ngIf="benchmark.running"
                    (click)="benchmark.abortBenchmark()"
            >Stop Benchmark</button>
            
        </mat-expansion-panel>
        
    `,
    styleUrls: ['./lod-tree-demo.component.scss']
})
export class LodTreeDemoComponent implements OnDestroy {

    private readonly renderer: Renderer;
    private destroyed$: Subject<void> = new Subject();

    readonly baseUrl: string = environment.production ? '/lod/neuschwanstein-depth5/' : 'http://localhost:5000/lod/neuschwanstein-depth9/';
    dynamicLod: DynamicLodController;
    initialSizeThreshold = 1.1;

    benchmark: Benchmark;

    controlModeControl = new FormControl();

    constructor(public rendererService: RendererService) {
        this.rendererService.setFpsAveragingWindow(20);
        this.rendererService.setControlMode('orbit-animation');
        this.controlModeControl.patchValue('orbit-animation');
        this.rendererService.setMovementSpeed(0.5);
        this.rendererService.setOrbitAnimation(30, 100, 30, 100000);

        this.renderer = this.rendererService.getRenderer();
        this.renderer.camera.setClippingDist(0.1, 10000);
        this.renderer.camera.setUpVector([0, 1, 0]);

        const loader = new XhrLodLoader(this.baseUrl);
        this.dynamicLod = new DynamicLodController(this.renderer, loader, this.initialSizeThreshold, {strategy: 'nthFrame', unloadThreshold: 100, nthFrame: 50});

        this.setUpBenchmark();

        this.rendererService.nextFrame.pipe(takeUntil(this.destroyed$)).subscribe((msPassed) => {
            this.dynamicLod.render();
            if (this.benchmark.running) {
                this.benchmark.record(msPassed, this.renderer.stats);
            }
        });
    }

    ngOnDestroy(): void {
        this.dynamicLod.destroy();
        this.renderer.removeAllNodes();
        this.renderer.render();
        this.destroyed$.next();
        this.destroyed$.complete();
    }

    setCamPos(sliderValue: number) {
        const startPointID = Math.floor(sliderValue);
        const progress = sliderValue - startPointID;
        this.benchmark.cameraPath.setCameraPosition(startPointID, progress);
    }

    setControlMode(mode: ControlMode) {
        if (this.benchmark.running && mode !== 'disabled') {
            this.benchmark.abortBenchmark();
        }

        this.rendererService.setControlMode(mode);
        if (mode ==='disabled') {
            this.setCamPos(this.benchmark.getProgress());
        }
    }

    private setUpBenchmark() {
        const cameraPath = new CameraPath(this.renderer.camera, [
            {
                pos: vec3.fromValues(-123.87712097167969, 40.665348052978516, 130.97201538085938),
                viewDirection: vec3.fromValues(0.5519500970840454, -0.29570692777633667, -0.779684841632843)
            },
            {
                pos: vec3.fromValues(-73.01689147949219, -1.5608155727386475, 22.44899559020996),
                viewDirection: vec3.fromValues( 0.9303686022758484, -0.21983617544174194, -0.29340478777885437)
            },
            {
                pos: vec3.fromValues(-26.93488883972168, -11.340331077575684, 9.762529373168945),
                viewDirection: vec3.fromValues(0.9359492063522339, 0.2806718647480011, -0.21265564858913422)
            },
            {
                pos: vec3.fromValues(54.45912170410156, 5.940879821777344, -11.91900634765625),
                viewDirection: vec3.fromValues(-0.7393689751625061, -0.08367259055376053, 0.6680811047554016)
            },
            {
                pos: vec3.fromValues(111.23981475830078, 52.36388397216797, -50.063785552978516),
                viewDirection: vec3.fromValues(-0.6645565032958984, -0.5060217976570129, 0.5498241186141968)
            },
        ]);
        this.benchmark = new Benchmark(cameraPath);
        this.benchmark.cameraPath.setCameraPosition(0, 0);
    }

}
