import { AfterViewInit, Component, ElementRef, HostListener, OnDestroy, ViewChild } from '@angular/core';
import { Subgrid } from '../lib/level-of-detail/octree-lod-buider/subgrid';
import { FirstPersonController } from '../lib/renderer/camera/first-person-controller';
import { OrbitAnimationController } from '../lib/renderer/camera/orbit-animation-controller';
import { Renderer } from '../lib/renderer/renderer';
import { mat4, vec3 } from 'gl-matrix';
import { GSVCrawler } from '../lib/street-view/gsv-crawler';
import { FpsCounter } from '../lib/utils/fps-counter';
import { WeightedLodNode } from '../lib/level-of-detail/lod-node';
import { PointCloudData, WeightedPointCloudData } from '../lib/data/point-cloud-data';
import { BoundingCube, BoundingSphere, Geometry } from '../lib/utils/geometry';
import { RendererNode } from '../lib/renderer/renderer-node';
import { StanfordDragonLoader } from '../lib/data/stanford-dragon-loader';
import { Timing } from '../lib/utils/timing';
import { OctreeLodBuilder } from '../lib/level-of-detail/octree-lod-buider/octree-lod-builder';
import { PointCloudDataGenerator } from '../lib/data/point-cloud-data-generator';
import { DynamicLodTree } from '../dynamic-lod/dynamic-lod-tree';
import { XhrLodLoader } from '../dynamic-lod/xhr-lod-loader';
import { StreetViewCrawlerDemo } from './demos/street-view-crawler-demo';
import { StreetViewStitchingDemo } from './demos/street-view-stitching-demo';

@Component({
    selector: 'app-root',
    template: `
        <app-main-overlay class="main-overlay-2"
                          [fps]="fps" 
                          [nodes]="nodesDrawn"
                          [points]="pointsDrawn"
                          [animate]="benchmarkRunning"
                          [hqSplats]="splattingEnabled"
                          [scale]="sizeScale"
                          (animateChange)="benchmarkRunning = $event"
                          (hqSplatsChange)="splattingEnabled = $event"
                          (scaleChange)="sizeScale = $event; renderer.setSplatSizeScale($event)">            
        </app-main-overlay>
        
        <div class="info-overlay">
            movement speed: {{movementSpeed.toFixed(2)}}
        </div>
        <div class="lod-overlay" *ngIf="weightedLodNode && optimizedLod">
            <div class="flex-line">
                LoD level:
                <input #lodSlider2 (input)="showLodLevel(+lodSlider2.value)" type="range" min="0"
                       max="{{optimizedLod.length - 1}}" step="1" value="0">
                {{+lodSlider2.value === treeDepth ? 'original data' : lodSlider2.value}}
            </div>
            <div>
                Total points: {{displayInfo.totalPoints}}
            </div>
            <div>
                Points rendered: {{displayInfo.renderedPoints}}
            </div>
            <div>
                LoD Octree nodes: {{displayInfo.octreeNodes}}
                <br> (geometry merged into one node)
            </div>
        </div>
        <div class="lod-overlay" *ngIf="dynamicLod">
            Nodes loaded: {{dynamicLod.stats.loadedNodes}}<br>
            Points loaded: {{dynamicLod.stats.loadedPoints}}<br><br>
            Nodes rendered: {{dynamicLod.stats.renderedNodes}}<br>
            Points rendered: {{dynamicLod.stats.renderedPoints}}<br><br>
            <div class="flex-line">
                Size threshold:
                <input #sizeThresholdSlider (input)="dynamicLod.sizeThreshold = +sizeThresholdSlider.value"
                       type="range" min="0.4" max="2.4" step="0.1" value="1.4">
                {{dynamicLod.sizeThreshold}}
            </div>
            (higher threshold = lower quality)
        </div>
        <div #wrapper class="full-size">
            <canvas #canvas oncontextmenu="return false"></canvas>
        </div>
        <div class="message-overlay" *ngIf="overlayMessage">{{overlayMessage}}</div>
    `,
    styleUrls: ['app.component.scss']
})
export class AppComponent implements AfterViewInit, OnDestroy {

    @ViewChild('canvas', {static: true}) canvasRef: ElementRef<HTMLCanvasElement>;
    @ViewChild('wrapper', {static: true}) wrapperRef: ElementRef<HTMLDivElement>;

    fps = 0;
    pointsDrawn: number = 0;
    nodesDrawn: number = 0;
    benchmarkRunning = true;
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

    // demos
    streetViewStitching: StreetViewStitchingDemo;
    streetViewCrawler: StreetViewCrawlerDemo;

    weightedLodNode: WeightedLodNode;
    treeDepth: number;
    optimizedLod: Array<{ data: WeightedPointCloudData, boundingSphere: BoundingSphere, sphereData: PointCloudData }>;
    boundingSphere: BoundingSphere;
    sphereData: RendererNode;
    lodData: RendererNode;

    dynamicLod: DynamicLodTree;

    displayInfo = {
        totalPoints: 0,
        renderedPoints: 0,
        octreeNodes: 0
    };

    overlayMessage = '';

    panoramaStitching = {
        lat: 90,
        lng: 0,
    };

    ngAfterViewInit(): void {
        this.renderer = new Renderer(this.canvasRef.nativeElement, 1, 1);
        this.fpController = new FirstPersonController(this.renderer.camera);
        this.orbitAnimation = new OrbitAnimationController(this.renderer.camera, 30, 100, 30, 15000);

        this.streetViewStitching = new StreetViewStitchingDemo(this.renderer, this.orbitAnimation, GSVCrawler.crawls.manhattan.slice(0, 16));
        // this.streetViewCrawler = new StreetViewCrawlerDemo();


        setTimeout(() => {
            //const instances = 64;
            //this.createDragonLod2(32, 12);
            //this.sphereTest(300000, 0.02, 4, 12);
            //this.loadDynamicLod2(1.4);

            this.renderLoop(0);
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

        if (this.benchmarkRunning) {
            // this.animatedCamera.nextFrame(this.renderer2);
            this.orbitAnimation.animate(duration);
        } else {
            this.checkCamera();
        }

        if (this.dynamicLod) {
            this.dynamicLod.render(!this.splattingEnabled);
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

    checkCamera() {
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

    createDragonLod2(resolution: number, maxDepth: number) {
        this.overlayMessage = 'Loading...';
        Timing.measure();
        const dragonLoader = new StanfordDragonLoader();
        dragonLoader.loadDropbox().then(data => {
            console.log(Timing.measure(), 'data loaded');
            this.displayInfo.totalPoints = data.positions.length / 3;

            const bb = Geometry.getBoundingBox(data.positions);
            const octree = new OctreeLodBuilder(bb, resolution, maxDepth);
            octree.addData(data);

            console.log(Timing.measure(), 'octree created');
            this.treeDepth = octree.root.getDepth();
            this.weightedLodNode = octree.buildLod();
            console.log(Timing.measure(), 'lod computed');
            this.optimizedLod = this.optimizeLod(this.weightedLodNode, octree.root.getDepth());
            console.log(Timing.measure(), 'lod optimized');

            this.overlayMessage = '';
            this.showLodLevel(0);
        });
    }

    loadDynamicLod2(sizeThreshold: number) {
        this.renderer.camera.setOrientation(
            vec3.fromValues(70, 30, 80),
            vec3.create(),
            vec3.fromValues(0, 1, 0)
        );

        const loader = new XhrLodLoader('http://localhost:5000/');
        this.dynamicLod = new DynamicLodTree(this.renderer, loader, sizeThreshold);
    }

    sphereTest(pointNumber: number, pointSize: number, resolution: number, maxDepth: number) {
        Timing.measure();
        const data = PointCloudDataGenerator.generateSphere(pointNumber, pointSize);
        console.log(Timing.measure(), 'data generated');
        const bb = Geometry.getBoundingBox(data.positions);
        const octree = new OctreeLodBuilder(bb, resolution, maxDepth);
        octree.addData(data);
        this.treeDepth = octree.root.getDepth();
        console.log(Timing.measure(), 'octree created');
        this.weightedLodNode = octree.buildLod();
        console.log(Timing.measure(), 'lod computed');
        this.optimizedLod = this.optimizeLod(this.weightedLodNode, this.treeDepth + 1);
        console.log(Timing.measure(), 'lod optimized');
        this.showLodLevel(0);
    }

    showLodLevel(lodLevel: number) {
        this.renderer.removeAllNodes();
        const nodes = this.getNodesAtSpecificDepth(this.weightedLodNode, lodLevel);
        this.displayInfo.octreeNodes = nodes.length;
        for (const node of nodes) {
            // this.renderer2.addData(node.positions, node.sizes, node.colors, node.normals);
        }

        const {data, boundingSphere, sphereData} = this.optimizedLod[lodLevel];
        this.displayInfo.renderedPoints = data.positions.length / 3;
        this.boundingSphere = boundingSphere;
        this.lodData = this.renderer.addData(data);
        this.sphereData = this.renderer.addData(sphereData);
    }

    getNodesAtSpecificDepth(root: WeightedLodNode, depth: number): Array<WeightedLodNode> {
        if (depth <= 0 || root.children.length == 0) {
            return [root];
        } else {
            let nodes: Array<WeightedLodNode> = [];
            for (const child of root.children) {
                nodes = nodes.concat(this.getNodesAtSpecificDepth(child as WeightedLodNode, depth - 1));
            }
            return nodes;
        }
    }

    optimizeLod(lodNode: WeightedLodNode, levels: number): Array<{ data: WeightedPointCloudData, boundingSphere: BoundingSphere, sphereData: PointCloudData }> {
        const optimizedLod: Array<{ data: WeightedPointCloudData, boundingSphere: BoundingSphere, sphereData: PointCloudData }> = [];
        for (let level = 0; level < levels; level++) {
            const nodes = this.getNodesAtSpecificDepth(lodNode, level);
            const data = Geometry.mergeLodNodes(nodes);
            const boundingSphere = Geometry.getBoundingSphere(data.positions, data.sizes);
            const sphereData = PointCloudDataGenerator.generateBoundingSphere(boundingSphere);
            optimizedLod.push({data, boundingSphere, sphereData});
        }
        return optimizedLod;
    }


}
