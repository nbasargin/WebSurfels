import { AfterViewInit, Component, ElementRef, HostListener, OnDestroy, ViewChild } from '@angular/core';
import { FirstPersonController } from '../lib/renderer/camera/first-person-controller';
import { OrbitAnimationController } from '../lib/renderer/camera/orbit-animation-controller';
import { HeadlightController } from '../lib/renderer/light/headlight-controller';
import { Renderer } from '../lib/renderer/renderer';
import { FpsCounter } from '../lib/utils/fps-counter';
import { DragonInBrowserLodDemo } from './demos/dragon-in-browser-lod-demo';
import { DynamicLodLoadingDemo } from './demos/dynamic-lod-loading-demo';
import { SphereDemo } from './demos/sphere-demo';
import { StreetViewCrawlerDemo } from './demos/street-view-crawler-demo';
import { StreetViewStitchingDemo } from './demos/street-view-stitching-demo';

@Component({
    selector: 'app-root',
    template: `
        <app-main-overlay *ngIf="showOverlay"
                          class="main-overlay-2"
                          [fps]="fps"
                          [nodes]="nodesDrawn"
                          [points]="pointsDrawn"
                          [animate]="animate"
                          [hqSplats]="splattingEnabled"
                          [scale]="sizeScale"
                          [speed]="movementSpeed"
                          (animateChange)="animate = $event"
                          (hqSplatsChange)="splattingEnabled = $event"
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
                    <input #hqCheck type="checkbox" [checked]="headlight.enabled" (change)="headlight.enabled = hqCheck.checked"> Use Headlight
                </label>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr;">
                <h1 style="grid-column: span 2">Splatting Depth</h1>
                <span>Depth-Size Ratio: {{renderer['uniforms'].splatDepthSizeRatio}}</span>
                <input #depthSizeRatioSlider type="range" min="0.1" max="2" step="0.1"
                       (input)="renderer['uniforms'].splatDepthSizeRatio = +depthSizeRatioSlider.value"
                       [value]="renderer['uniforms'].splatDepthSizeRatio">
            </div>

            <ng-container *ngIf="demos?.dragon as demo">
                <h1>In-Browser LOD Construction Demo</h1>
                <span *ngIf="demo.loading">LOADING...</span>
                <ng-container *ngIf="!demo.loading">
                    Show LOD level:
                    <button *ngFor="let i of demo.levels" (click)="demo.showLodLevel(i)">{{i}}</button>
                </ng-container>
            </ng-container>

            <ng-container *ngIf="demos?.sphere as demo">
                <h1>Sphere Demo</h1>
                <button *ngFor="let preset of demo.presets"
                        (click)="demo.addSphere(preset)">{{preset.points + ' points'}}</button>
            </ng-container>

            <ng-container *ngIf="demos?.castle as demo">
                <h1>Dynamic LOD Loading Demo</h1>
                <div>Points loaded: {{demo.dynamicLod.stats.loadedPoints.toLocaleString('en-us')}}</div>
                <div>Nodes loaded: {{demo.dynamicLod.stats.loadedNodes.toLocaleString('en-us')}}</div>
                <div>Size threshold:
                    <input #sizeThresholdSlider (input)="demo.dynamicLod.sizeThreshold = +sizeThresholdSlider.value"
                           type="range" min="0.4" max="2.4" step="0.1" [value]="demo.initialSizeThreshold">
                    {{demo.dynamicLod.sizeThreshold}}
                </div>
                (higher threshold = lower quality)
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
    pointsDrawn: number = 0;
    nodesDrawn: number = 0;
    animate = true;
    splattingEnabled = true;
    sizeScale = 1;

    movementSpeed = 10;

    renderer: Renderer;

    // render loop
    private fpsCounter: FpsCounter = new FpsCounter(20);
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
    };

    ngAfterViewInit(): void {
        this.renderer = new Renderer(this.canvasRef.nativeElement, 1, 1);
        this.fpController = new FirstPersonController(this.renderer.camera);
        this.orbitAnimation = new OrbitAnimationController(this.renderer.camera, 30, 100, 30, 15000);

        this.headlight = new HeadlightController(this.renderer.light, this.renderer.camera);

        setTimeout(() => {
            this.demos = {
                // select ONE here
                dragon: new DragonInBrowserLodDemo(this.renderer, this.orbitAnimation),
                // crawler: new StreetViewCrawlerDemo(),
                // stitching: new StreetViewStitchingDemo(this.renderer, this.orbitAnimation),
                // sphere: new SphereDemo(this.renderer, this.orbitAnimation),
                // castle: new DynamicLodLoadingDemo(this.renderer, this.orbitAnimation),
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
            this.demos.castle.dynamicLod.render(!this.splattingEnabled);
            this.pointsDrawn = this.demos.castle.dynamicLod.stats.renderedPoints;
            this.nodesDrawn = this.demos.castle.dynamicLod.stats.renderedNodes;

        } else {
            const stats = this.renderer.render(this.renderer.nodes, !this.splattingEnabled);
            this.pointsDrawn = stats.pointsDrawn;
            this.nodesDrawn = stats.nodesDrawn;
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

}
