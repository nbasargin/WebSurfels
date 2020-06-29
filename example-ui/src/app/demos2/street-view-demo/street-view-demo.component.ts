import { Component, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { vec3 } from '../../../../../web-surfels/lib/esm/index';
import { Benchmark } from '../../benchmarks/benchmark';
import { CameraPath } from '../../benchmarks/camera-path';
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
            >Enable loading</mat-slide-toggle>
            
            <div matTooltip="Highest quality will be chosen for panoramas within this distance.
                                More distant panoramas are rendered in lower quality.">
                Quality distance:              
                <mat-slider 
                        style="width: 100%"
                            [value]="controller.qualityDist"
                            [color]="'primary'" [min]="20" [max]="150" [step]="10"
                            [tickInterval]="10" thumbLabel
                            (input)="controller.qualityDist = $event.value"
                ></mat-slider>                
            </div>
            <div matTooltip="All panoramas within this distance will be loaded if available.">
                Loading distance:
                <mat-slider style="width: 100%"
                            [value]="controller.loadingDist"
                            [color]="'primary'" [min]="40" [max]="300" [step]="10"
                            [tickInterval]="10" thumbLabel
                            (input)="controller.loadingDist = $event.value"
                ></mat-slider>
            </div>
            
            <div>
                Memory Limits
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
                >Forget Errors & Retry</button>
            </div>
        </mat-expansion-panel>
    `,
    styleUrls: ['./street-view-demo.component.scss']
})
export class StreetViewDemoComponent implements OnDestroy {

    private readonly renderer: Renderer;
    private destroyed$: Subject<void> = new Subject();

    controller: DynamicStreetViewController;

    benchmark: Benchmark;
    datasets = {
        paris25k: {
            path: 'paris25k',
            startID: 'PxH7e1kCSV7p728tziDR_w'
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

    constructor(private rendererService: RendererService) {
        this.rendererService.setFpsAveragingWindow(20);
        this.rendererService.setControlMode('first-person');
        this.rendererService.setMovementSpeed(0.5);

        this.renderer = this.rendererService.getRenderer();
        this.renderer.camera.setClippingDist(0.1, 10000);
        this.renderer.camera.setOrientation([169.29, -114.45, 50.61], [103.97, -79.77, -16.68], [0, 1, 0]);

        this.renderer.light.ambientIntensity = 1;

        const data = this.datasets.paris25k;

        // const api = new GoogleStreetViewApi();
        const api = new LocalStreetViewApi(`http://localhost:5000/gsv/${data.path}`);
        const loader = new StreetViewLoader(api, 0.4, 1.5);
        this.controller = new DynamicStreetViewController(this.renderer, loader, 50, 100, {
            softMinimum: 10_000_000,
            softMaximum: 50_000_000
        }, data.startID);

        this.setUpBenchmark();

        this.rendererService.nextFrame.pipe(takeUntil(this.destroyed$)).subscribe((msPassed) => {
            this.rendererService.setControlMode(this.benchmark.running ? 'disabled' : 'first-person');
            this.controller.render();
        });
    }

    ngOnDestroy(): void {
        // this.dynamicLod.destroy();
        this.renderer.removeAllNodes();
        this.renderer.render();
        this.destroyed$.next();
        this.destroyed$.complete();
    }

    private setUpBenchmark() {
        const cameraPath = new CameraPath(this.renderer.camera, [
            {
                pos: vec3.fromValues(1240.0255126953125, 428.3453369140625, -51.90530776977539),
                viewDirection: vec3.fromValues(-0.9269274473190308, -0.3198262155056, -0.19625674188137054)
            },
            {
                pos: vec3.fromValues(389.5700378417969, 8.811860084533691, -333.1141052246094),
                viewDirection: vec3.fromValues(-0.5020412802696228, -0.8314081430435181, 0.23814919590950012)
            },
            {
                pos: vec3.fromValues(329.5191650390625, -384.33477783203125, -177.86441040039062),
                viewDirection: vec3.fromValues(-0.7333635091781616, 0.6777465343475342, -0.053268913179636)
            },
            {
                pos: vec3.fromValues(-180.10511779785156, -241.0279083251953, 211.83261108398438),
                viewDirection: vec3.fromValues(-0.01191917434334755, 0.8558781147003174, -0.5170401930809021)
            },
            {
                pos: vec3.fromValues(-259.0425720214844, -459.4671630859375, 533.74365234375),
                viewDirection: vec3.fromValues(0.06708746403455734, 0.5258428454399109, -0.8479319214820862)
            },
            {
                pos: vec3.fromValues(-360.62603759765625, -110.98513793945312, 386.25799560546875),
                viewDirection: vec3.fromValues(0.15893428027629852, 0.36665815114974976, -0.9166797399520874)
            },
            {
                pos: vec3.fromValues(-270.24658203125, 123.03898620605469, 272.4951171875),
                viewDirection: vec3.fromValues(-0.25811368227005005, -0.8686648607254028, -0.42284587025642395)
            },
            {
                pos: vec3.fromValues(-124.8250961303711, 573.46044921875, 117.2672119140625),
                viewDirection: vec3.fromValues(-0.9989715218544006, -0.04266732931137085, 0.015343156643211842)
            },
        ]);
        this.benchmark = new Benchmark(cameraPath);
    }

}
