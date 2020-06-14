import { AfterViewInit, Component, ElementRef, HostListener, OnDestroy, ViewChild } from '@angular/core';
import { FirstPersonController } from 'web-surfels/lib/src/controllers/camera/first-person-controller';
import { OrbitAnimationController } from 'web-surfels/lib/src/controllers/camera/orbit-animation-controller';
import { HeadlightController } from 'web-surfels/lib/src/controllers/light/headlight-controller';
import { Renderer } from 'web-surfels/lib/src/renderer/renderer';
import { RenderingStats } from 'web-surfels/lib/src/renderer/rendering-stats';
import { FpsCounter } from 'web-surfels/lib/src/utils/fps-counter';
import { DragonInBrowserLodDemo } from './demos/dragon-in-browser-lod-demo';
import { DynamicLodLoadingDemo } from './demos/dynamic-lod-loading-demo';
import { DynamicStreetViewDemo } from './demos/dynamic-street-view-demo';
import { MemoryLimitsDemo } from './demos/memory-limits-demo';
import { SphereDemo } from './demos/sphere-demo';
import { StreetViewCrawlerDemo } from './demos/street-view-crawler-demo';
import { StreetViewPointMergingDemo } from './demos/street-view-point-merging-demo';
import { StreetViewStitchingDemo } from './demos/street-view-stitching-demo';

@Component({
    selector: 'app-root',
    template: `
        <app-main-overlay *ngIf="showOverlay"
                          class="main-overlay-2"
                          [fps]="fps"
                          [nodes]="renderingStats.nodesDrawn"
                          [points]="renderingStats.pointsDrawn"
                          [animate]="animate"
                          [hqSplats]="renderer.highQuality"
                          [scale]="sizeScale"
                          [speed]="movementSpeed"
                          (animateChange)="animate = $event"
                          (hqSplatsChange)="renderer.highQuality = $event"
                          (scaleChange)="sizeScale = $event; renderer.setSplatSizeScale($event)">

            <div style="display: grid; grid-template-columns: 1fr 1fr;">
                <h1 style="grid-column: span 2">Lighting</h1>
                <span>Ambient: {{renderer.light.ambientIntensity}}</span>
                <input #ambientIntensitySlider type="range" min="0.0" max="1.0" step="0.1"
                       (input)="renderer.light.ambientIntensity = +ambientIntensitySlider.value"
                       [value]="renderer.light.ambientIntensity">

                <span>Specular: {{renderer.light.specularIntensity}}</span>
                <input #specularIntensitySlider type="range" min="0.0" max="1.0" step="0.1"
                       (input)="renderer.light.specularIntensity = +specularIntensitySlider.value"
                       [value]="renderer.light.specularIntensity">

                <span>Shininess: {{renderer.light.specularShininess}}</span>
                <input #specularIShininessSlider type="range" min="1" max="64" step="1"
                       (input)="renderer.light.specularShininess = +specularIShininessSlider.value"
                       [value]="renderer.light.specularShininess">
                <label>
                    <input #hqCheck type="checkbox" [checked]="headlight.enabled"
                           (change)="headlight.enabled = hqCheck.checked"> Use Headlight
                </label>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr;">
                <h1 style="grid-column: span 2">Splatting Depth</h1>
                <span>Depth-Size Ratio: {{renderer['uniforms'].splatDepthSizeRatio}}</span>
                <input #depthSizeRatioSlider type="range" min="0.1" max="2" step="0.1"
                       (input)="renderer['uniforms'].splatDepthSizeRatio = +depthSizeRatioSlider.value"
                       [value]="renderer['uniforms'].splatDepthSizeRatio">
                <div>
                    <button (click)=logCameraPosition()>Log camera position</button>
                </div>
            </div>

            <ng-container *ngIf="demos?.dragon as demo">
                <h1>In-Browser LOD Construction Demo</h1>
                <span *ngIf="demo.loading">LOADING...</span>
                <ng-container *ngIf="!demo.loading">
                    Show LOD level:<br>
                    <span style="width:100px; display: inline-block">No Jitter:</span>
                    <button *ngFor="let i of demo.levels" (click)="demo.showLodLevel(i, false)">{{i}}</button>
                    <br>
                    <span style="width:100px; display: inline-block">With Jitter:</span>
                    <button *ngFor="let i of demo.levels" (click)="demo.showLodLevel(i, true)">{{i}}</button>
                    <br>
                    Currently shown: LOD {{demo.lodLevel}}, {{demo.jitter ? 'with' : 'no'}} jitter
                </ng-container>
            </ng-container>

            <ng-container *ngIf="demos?.sphere as demo">
                <h1>Sphere Benchmark</h1>
                <span style="width: 100px; display: inline-block">Points:</span>
                <button *ngFor="let preset of demo.presets"
                        (click)="demo.addSphere(preset)">{{preset.points.toLocaleString('en-us')}}</button>
                <br>
                <span style="width: 100px; display: inline-block">Camera:</span>
                <button (click)="demo.farCam()">far</button>
                <button (click)="demo.nearCam()">near</button>
                <br>
                <span style="width: 100px; display: inline-block">FPS:</span>
                {{this.frozenFPS.toLocaleString('en-us')}}
                <button (click)="this.frozenFPS = this.fps">Update</button>
                <br>
                <span style="width: 100px; display: inline-block">Resolution:</span> {{canvas.width}}
                x {{canvas.height}}
            </ng-container>

            <ng-container *ngIf="demos?.castle as demo">
                <h1>Dynamic LOD Loading Demo</h1>
                <div>Points loaded: {{demo.dynamicLod.stats.pointsLoaded.toLocaleString('en-us')}}</div>
                <div>Nodes loaded: {{demo.dynamicLod.stats.nodesLoaded.toLocaleString('en-us')}}</div>
                <div>Size threshold:
                    <input #sizeThresholdSlider (input)="demo.dynamicLod.sizeThreshold = +sizeThresholdSlider.value"
                           type="range" min="0.4" max="2.4" step="0.1" [value]="demo.initialSizeThreshold">
                    {{demo.dynamicLod.sizeThreshold}}
                </div>
                (higher threshold = lower quality)

                <h1>Benchmark</h1>
                Camera positions:
                <button *ngFor="let p of demo.benchmark.cameraPath.points; let i = index"
                        (click)="demo.benchmark.cameraPath.setCameraPosition(i)">{{i}}</button>
                <br>
                Benchmark:
                <button *ngIf="!demo.benchmark.running" (click)="demo.benchmark.startBenchmark()">Start</button>
                <span *ngIf="demo.benchmark.running">running... frame {{demo.benchmark.data!.frameDurations.length}}</span>
                <button *ngIf="demo.benchmark.data && !demo.benchmark.running"
                        (click)="demo.benchmark.exportBenchmarkResults()">Export results
                </button>
            </ng-container>

            <ng-container *ngIf="demos?.streetView as demo">
                <h1>Dynamic Street View Demo</h1>
                <div>Points in memory: {{demo.controller.pointsInMemory.toLocaleString('en-us')}}</div>
                <div>
                    Soft limits:
                    {{demo.controller.pointLoadingBudgets.softMinimum.toLocaleString('en-us')}} -
                    {{demo.controller.pointLoadingBudgets.softMaximum.toLocaleString('en-us')}}
                </div>
                <div *ngIf="demo.controller.hasNetworkErrors()">
                    There are network errors! Is the server connection fine and all required data available?
                    <button (click)="demo.controller.forgetPreviousNetworkErrors()">Forget previous errors</button>
                </div>
                <h1>Benchmark</h1>
                Camera positions:
                <button *ngFor="let p of demo.benchmark.cameraPath.points; let i = index"
                        (click)="demo.benchmark.cameraPath.setCameraPosition(i)">{{i}}</button>
                <br>
                Benchmark:
                <button *ngIf="!demo.benchmark.running" (click)="demo.benchmark.startBenchmark()">Start</button>
                <span *ngIf="demo.benchmark.running">running... frame {{demo.benchmark.data!.frameDurations.length}}</span>
                <button *ngIf="demo.benchmark.data && !demo.benchmark.running"
                        (click)="demo.benchmark.exportBenchmarkResults()">Export results
                </button>
            </ng-container>

            <ng-container *ngIf="demos?.memory as demo">
                <h1>Memory limits demo</h1>
                <span>Test memory capacity for 100 million points.</span><br>
                <button *ngIf="!demo.testRunning && !demo.done" (click)="demo.test()">TEST</button>
                <span *ngIf="demo.testRunning && !demo.done">Test running...</span>
                <span *ngIf="demo.done">DONE!</span>
                <br>
                <span>{{demo.points.toLocaleString('en-us')}} points on the GPU</span>
            </ng-container>

            <ng-container *ngIf="demos?.pointMerging as demo">
                <h1>Street View Small Point Merging Demo</h1>
                <ng-container *ngIf="demo.nodeRaw && demo.nodeOptimized">
                    <button (click)="demo.showOptimized()">Show optimized</button>
                    <button (click)="demo.showRaw()">Show raw</button>                    
                </ng-container>
                <ng-container *ngIf="!demo.nodeRaw || !demo.nodeOptimized">
                    Loading...
                </ng-container>
            </ng-container>

        </app-main-overlay>

        <div #wrapper class="full-size">
            <canvas #canvas oncontextmenu="return false"></canvas>
        </div>
    `,
    styleUrls: ['app.component.scss']
})
export class AppComponent implements AfterViewInit, OnDestroy {

    @ViewChild('canvas', {static: true}) canvasRef: ElementRef<HTMLCanvasElement>;
    @ViewChild('wrapper', {static: true}) wrapperRef: ElementRef<HTMLDivElement>;

    showOverlay = false;

    fps = 0;
    renderingStats: RenderingStats = {
        nodesDrawn: 0,
        nodesLoaded: 0,
        pointsDrawn: 0,
        pointsLoaded: 0,
    };
    animate = false;
    frozenFPS = 0;
    sizeScale = 1;

    movementSpeed = 10;

    renderer: Renderer;

    // render loop
    private fpsCounter: FpsCounter = new FpsCounter(100);
    private animationRequest;
    private lastTimestamp = 0;

    // controls
    private pressedKeys: Set<string> = new Set();
    private fpController: FirstPersonController;
    private orbitAnimation: OrbitAnimationController;

    headlight: HeadlightController;

    // demos
    demos: {
        dragon?: DragonInBrowserLodDemo,
        stitching?: StreetViewStitchingDemo,
        crawler?: StreetViewCrawlerDemo,
        sphere?: SphereDemo,
        castle?: DynamicLodLoadingDemo,
        streetView?: DynamicStreetViewDemo,
        memory?: MemoryLimitsDemo,
        pointMerging?: StreetViewPointMergingDemo,
    };

    ngAfterViewInit(): void {
        this.renderer = new Renderer(this.canvasRef.nativeElement, 1, 1);
        this.fpController = new FirstPersonController(this.renderer.camera);
        this.orbitAnimation = new OrbitAnimationController(this.renderer.camera, 30, 100, 30, 0, 15000);

        this.headlight = new HeadlightController(this.renderer.light, this.renderer.camera);

        setTimeout(() => {
            this.demos = {
                // select ONE here
                // dragon: new DragonInBrowserLodDemo(this.renderer, this.orbitAnimation),
                // crawler: new StreetViewCrawlerDemo(),
                // stitching: new StreetViewStitchingDemo(this.renderer, this.orbitAnimation),
                sphere: new SphereDemo(this.renderer, this.orbitAnimation),
                // castle: new DynamicLodLoadingDemo(this.renderer, this.orbitAnimation),
                // streetView: new DynamicStreetViewDemo(this.renderer, this.orbitAnimation),
                // memory: new MemoryLimitsDemo(this.renderer),
                // pointMerging: new StreetViewPointMergingDemo(this.renderer, this.orbitAnimation),
            };

            for (const demo of Object.values(this.demos)) {
                if (!demo) {
                    continue;
                }
                this.movementSpeed = demo.preferredMovementSpeed;
            }

            this.renderLoop(0);
            this.showOverlay = true;
        }, 0);

    }

    ngOnDestroy(): void {
        cancelAnimationFrame(this.animationRequest);
        this.renderer.removeAllNodes();
    }

    @HostListener('document:keydown', ['$event'])
    keyDown(e: KeyboardEvent) {
        this.pressedKeys.add(e.code);
    }

    @HostListener('document:keyup', ['$event'])
    keyUp(e: KeyboardEvent) {
        this.pressedKeys.delete(e.code);
        if (e.key == ' ') {
            this.showOverlay = !this.showOverlay;
        }
    }

    @HostListener('mousemove', ['$event'])
    mouseMove(e: MouseEvent) {
        if ((e.buttons & 1) !== 1) {
            return;  // left mouse button not pressed
        }
        if (e.target !== this.canvasRef.nativeElement) {
            return;
        }

        this.fpController.addPitch(-e.movementY * 0.1);
        this.fpController.addYaw(-e.movementX * 0.1);
    }

    @HostListener('window:blur')
    mouseLeave() {
        this.pressedKeys.clear();
    }

    @HostListener('window:wheel', ['$event'])
    mousewheel(e: WheelEvent) {
        const factor = 1.1;
        if (e.deltaY < 0) {
            this.movementSpeed *= factor;
        } else {
            this.movementSpeed /= factor;
        }
        this.movementSpeed = Math.max(0.01, Math.min(100, this.movementSpeed));
    }

    renderLoop(timestamp) {
        const duration = this.lastTimestamp > 0 ? timestamp - this.lastTimestamp : 0;
        this.lastTimestamp = timestamp;

        this.updateFPS(duration);

        this.animationRequest = requestAnimationFrame(timestamp => this.renderLoop(timestamp));
        this.checkCanvasSize();

        if (this.animate) {
            this.orbitAnimation.animate(duration * this.movementSpeed);
        } else {
            this.moveCamera();
        }

        this.headlight.update();

        if (this.demos.castle) {
            this.demos.castle.dynamicLod.render();
            this.renderingStats = this.demos.castle.dynamicLod.stats;
            this.demos.castle.benchmark.record(duration, this.renderingStats);

        } else if (this.demos.streetView) {
            this.renderingStats = this.demos.streetView.controller.render();
            this.demos.streetView.benchmark.record(duration, this.renderingStats);

        } else if (this.demos.memory) {
            this.demos.memory.render();

        } else {
            this.renderingStats = this.renderer.render(this.renderer.nodes);
        }
    }

    updateFPS(duration: number) {
        this.fpsCounter.addDuration(duration);
        this.fps = (1000 / this.fpsCounter.getAvgDuration());
    }

    moveCamera() {
        const movementSpeed = 0.05 * this.movementSpeed;

        if (this.pressedKeys.has('KeyW')) {
            this.fpController.moveForward(movementSpeed);
        }
        if (this.pressedKeys.has('KeyA')) {
            this.fpController.moveRight(-movementSpeed);
        }
        if (this.pressedKeys.has('KeyS')) {
            this.fpController.moveForward(-movementSpeed);
        }
        if (this.pressedKeys.has('KeyD')) {
            this.fpController.moveRight(movementSpeed);
        }
    }

    checkCanvasSize() {
        const c = this.canvasRef.nativeElement;
        const w = this.wrapperRef.nativeElement;
        const bb = w.getBoundingClientRect();

        const resolution = window.devicePixelRatio || 1;
        const width = Math.round(bb.width * resolution);
        const height = Math.round(bb.height * resolution);

        if (c.width !== width || c.height !== height) {
            this.renderer.setCanvasSize(width, height);
            console.debug(`resizing canvas to ${width} x ${height}`);
        }
    }

    logCameraPosition() {
        console.log('Camera eye:', this.renderer.camera.eye);
        console.log('Camera view direction:', this.renderer.camera.viewDirection);

    }

}
