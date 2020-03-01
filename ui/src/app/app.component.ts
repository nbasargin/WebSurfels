import { AfterViewInit, Component, ElementRef, HostListener, OnDestroy, ViewChild } from '@angular/core';
import { vec3 } from 'gl-matrix';
import { CullingTree } from '../point-cloud-rendering/culling-tree/culling-tree';
import { RendererNode } from '../point-cloud-rendering/renderer2/renderer-node';
import { AnimatedCamera } from '../point-cloud-rendering/utils/animated-camera';
import { FpsCounter } from '../point-cloud-rendering/utils/fps-counter';
import { Timing } from '../point-cloud-rendering/utils/timing';
import { PointCloudData, WeightedPointCloudData } from '../point-cloud-rendering/data/point-cloud-data';
import { PointCloudDataGenerator } from '../point-cloud-rendering/data/point-cloud-data-generator';
import { StanfordDragonLoader } from '../point-cloud-rendering/data/stanford-dragon-loader';
import { LodTree } from '../point-cloud-rendering/level-of-detail/lod-tree';
import { OctreeLodBuilder } from '../point-cloud-rendering/level-of-detail/octree-lod-buider/octree-lod-builder';
import { Renderer2 } from '../point-cloud-rendering/renderer2/renderer2';
import { ViewDirection } from '../point-cloud-rendering/renderer2/view-direction';
import { BoundingSphere, Geometry } from '../point-cloud-rendering/utils/geometry';
import { DepthData } from '../street-view/depth-data';
import { PanoramaLoader } from '../street-view/panorama-loader';
import { PointCloudFactory } from '../street-view/point-cloud-factory';

@Component({
    selector: 'app-root',
    template: `
        <div class="fps-overlay">FPS: {{fps}}</div>
        <div class="animation-overlay">
            <div class="flex-line">
                <input #animCheck type="checkbox" [checked]="true" (change)="benchmarkRunning = animCheck.checked">
                Animate
            </div>
            <div class="flex-line">
                <input #splatCheck type="checkbox" [checked]="true" (change)="splattingEnabled = splatCheck.checked">
                HQ splats
            </div>
        </div>
        <div class="info-overlay">
            movement speed: {{movementSpeed.toFixed(2)}}
        </div>
        <div class="lod-overlay" *ngIf="lodTree && optimizedLod">
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
            {{frustumInfo}}
        </div>
        <div class="lod-overlay" *ngIf="rendererDetails">
            Nodes rendered: {{rendererDetails.nodesDrawn}}<br>
            Points rendered: {{rendererDetails.pointsDrawn}}<br>
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
    fps = '0';

    private animationRequest;
    private renderer2: Renderer2;

    private readonly cameraPos: vec3;
    private readonly view: ViewDirection;
    private angleX: number = Math.PI / 180 * -27;
    private angleY: number = Math.PI / 180 * -22;
    movementSpeed = 1;

    private pressedKeys: Set<string>;

    benchmarkRunning = true;
    splattingEnabled = true;
    private animatedCamera: AnimatedCamera = new AnimatedCamera();
    private fpsCounter: FpsCounter = new FpsCounter(20);
    private lastTimestamp = 0;

    lodTree: LodTree;
    treeDepth: number;
    optimizedLod: Array<{data: WeightedPointCloudData, boundingSphere: BoundingSphere, sphereData: PointCloudData}>;
    boundingSphere: BoundingSphere;
    sphereData: RendererNode;
    lodData: RendererNode;

    private cullingTree: CullingTree;
    rendererDetails: {nodesDrawn: number, pointsDrawn: number};

    displayInfo = {
        totalPoints: 0,
        renderedPoints: 0,
        octreeNodes: 0
    };

    overlayMessage = '';
    frustumInfo = '';

    constructor() {
        this.cameraPos = vec3.fromValues(-2, 1.2, 2.5);
        this.view = new ViewDirection(false);
        this.pressedKeys = new Set();
    }

    ngAfterViewInit(): void {
        this.renderer2 = new Renderer2(this.canvasRef.nativeElement, 1, 1);
        this.view.update(this.angleX, this.angleY);
        setTimeout(() => {
            //const instances = 64;
            // this.createDragonLod2(32, 12);
            //this.testStreetView();
            this.castleTest(64, 12, 0.25);
            //this.sphereTest(300000, 0.02, 4, 12);
            //this.createDynamicLod(64, 12, 0.20);

            this.renderLoop(0);
        }, 0);
    }

    ngOnDestroy(): void {
        cancelAnimationFrame(this.animationRequest);
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

        const degreesPerPixel = -0.1;
        const radians = Math.PI / 180;
        const maxVerticalAngle = 85;
        this.angleX += radians * e.movementX * degreesPerPixel;
        this.angleY += radians * e.movementY * degreesPerPixel;
        this.angleY = Math.max(radians * -maxVerticalAngle, Math.min(radians * maxVerticalAngle, this.angleY));
        this.view.update(this.angleX, this.angleY);
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
        this.updateFPS(timestamp);

        this.animationRequest = requestAnimationFrame(timestamp => this.renderLoop(timestamp));
        this.checkCanvasSize();

        if (this.benchmarkRunning) {
            this.animatedCamera.nextFrame(this.renderer2);
        } else {
            this.checkCamera();
        }

        // TEMP: assuming one node with bounding sphere defined
        this.renderer2.frustum.updateFrustumPlanes();
        if (this.cullingTree) {
            this.rendererDetails = this.cullingTree.render(!this.splattingEnabled);
        } else {
            this.renderer2.render(this.renderer2.nodes, !this.splattingEnabled);
        }
    }

    updateFPS(timestamp: number) {
        if (this.lastTimestamp > 0) {
            const duration = timestamp - this.lastTimestamp;
            this.fpsCounter.addDuration(duration);
            this.fps = (1000 / this.fpsCounter.getAvgDuration()).toFixed(2);
        }
        this.lastTimestamp = timestamp;
    }

    checkCamera() {
        const movementSpeed = 0.05 * this.movementSpeed;
        const right = vec3.create();
        vec3.cross(right, this.view.direction, this.view.up);
        vec3.normalize(right, right);
        const front = vec3.create();
        vec3.normalize(front, this.view.direction);

        if (this.pressedKeys.has('KeyW')) {
            vec3.scaleAndAdd(this.cameraPos, this.cameraPos, front, movementSpeed);
        }
        if (this.pressedKeys.has('KeyA')) {
            vec3.scaleAndAdd(this.cameraPos, this.cameraPos, right, -movementSpeed);
        }
        if (this.pressedKeys.has('KeyS')) {
            vec3.scaleAndAdd(this.cameraPos, this.cameraPos, front, -movementSpeed);
        }
        if (this.pressedKeys.has('KeyD')) {
            vec3.scaleAndAdd(this.cameraPos, this.cameraPos, right, movementSpeed);
        }

        const viewTarget = vec3.add(vec3.create(), this.cameraPos, this.view.direction);
        this.renderer2.setCameraOrientation(this.cameraPos, viewTarget, this.view.up);
    }

    checkCanvasSize() {
        const c = this.canvasRef.nativeElement;
        const w = this.wrapperRef.nativeElement;
        const bb = w.getBoundingClientRect();

        const resolution = window.devicePixelRatio || 1;
        const width = Math.round(bb.width * resolution);
        const height = Math.round(bb.height * resolution);

        if (c.width !== width || c.height !== height) {
            this.renderer2.setCanvasSize(width, height);
            console.debug(`resizing canvas to ${width} x ${height}`);
        }
    }

    testStreetView() {

        // panorama loader

        const factory = new PointCloudFactory();

        Promise.all([
            PanoramaLoader.loadById('GTKQkr3G-rRZQisDUMzUtg'),
            PanoramaLoader.loadImage('GTKQkr3G-rRZQisDUMzUtg', 0, 0, 0)
        ]).then(([pano, bitmap]) => {
            const depthData = new DepthData(pano.model.depth_map);

            console.log('depth data', depthData);
            console.log('color data bitmap', bitmap);

            const pointCloud = factory.constructPointCloud(bitmap, depthData);

            this.renderer2.addData(pointCloud.positions, pointCloud.sizes, pointCloud.colors, pointCloud.normals);

        });
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
            this.lodTree = octree.buildLod();
            console.log(Timing.measure(), 'lod computed');
            this.optimizedLod = this.optimizeLod(this.lodTree, octree.root.getDepth());
            console.log(Timing.measure(), 'lod optimized');

            this.overlayMessage = '';
            this.showLodLevel(0);
        });
    }

    createDynamicLod(resolution: number, maxDepth: number, sizeThreshold: number) {
        this.overlayMessage = 'Loading...';
        Timing.measure();
        const dragonLoader = new StanfordDragonLoader();
        dragonLoader.loadDropbox().then(data => {
            console.log(Timing.measure(), 'data loaded');
            const multipliedData = Geometry.multiplyData(data, 16, 8);
            console.log(Timing.measure(), 'data multiplied');
            const bb = Geometry.getBoundingBox(multipliedData.positions);
            const octree = new OctreeLodBuilder(bb, resolution, maxDepth);
            octree.addData(multipliedData);
            console.log(Timing.measure(), 'octree created');
            this.lodTree = octree.buildLod();
            console.log(Timing.measure(), 'lod computed');
            this.cullingTree = new CullingTree(this.renderer2, sizeThreshold, this.lodTree);
            console.log(Timing.measure(), 'culling ready');
            this.overlayMessage = '';
        });
    }

    castleTest(resolution: number, maxDepth: number, sizeThreshold: number) {
        this.overlayMessage = 'Loading...';
        const dragonLoader = new StanfordDragonLoader();
        dragonLoader.loadCastle().then(data => {
            console.log(Timing.measure(), 'LOADED data');
            this.displayInfo.totalPoints = data.positions.length / 3;
            const bb = Geometry.getBoundingBox(data.positions);
            const octree = new OctreeLodBuilder(bb, resolution, maxDepth);
            octree.addData(data);
            console.log(Timing.measure(), 'octree created');
            this.lodTree = octree.buildLod();
            console.log(Timing.measure(), 'LOD created');
            this.cullingTree = new CullingTree(this.renderer2, sizeThreshold, this.lodTree);
            console.log(Timing.measure(), 'culling ready');
            this.lodTree = null as any;
            this.overlayMessage = '';
        });
    }

    sphereTest(pointNumber: number, pointSize: number, resolution: number, maxDepth: number) {
        vec3.set(this.cameraPos, 0, 0, 3);
        this.angleX = 0;
        this.angleY = 0;
        this.view.update(this.angleX, this.angleY);
        Timing.measure();
        const data = PointCloudDataGenerator.generateSphere(pointNumber, pointSize);
        console.log(Timing.measure(), 'data generated');
        const bb = Geometry.getBoundingBox(data.positions);
        const octree = new OctreeLodBuilder(bb, resolution, maxDepth);
        octree.addData(data);
        this.treeDepth = octree.root.getDepth();
        console.log(Timing.measure(), 'octree created');
        this.lodTree = octree.buildLod();
        console.log(Timing.measure(), 'lod computed');
        this.optimizedLod = this.optimizeLod(this.lodTree, this.treeDepth + 1);
        console.log(Timing.measure(), 'lod optimized');
        this.showLodLevel(0);
    }

    showLodLevel(lodLevel: number) {
        this.renderer2.removeAllNodes();
        const nodes = this.getNodesAtSpecificDepth(this.lodTree, lodLevel);
        this.displayInfo.octreeNodes = nodes.length;
        for (const node of nodes) {
            // this.renderer2.addData(node.positions, node.sizes, node.colors, node.normals);
        }

        const {data, boundingSphere, sphereData} = this.optimizedLod[lodLevel];
        this.displayInfo.renderedPoints = data.positions.length / 3;
        this.boundingSphere = boundingSphere;
        this.lodData = this.renderer2.addData(data.positions, data.sizes, data.colors, data.normals);
        this.sphereData = this.renderer2.addData(sphereData.positions, sphereData.sizes, sphereData.colors, sphereData.normals);
    }

    getNodesAtSpecificDepth(root: LodTree, depth: number): Array<LodTree> {
        if (depth <= 0 || root.children.length == 0) {
            return [root];
        } else {
            let nodes: Array<LodTree> = [];
            for (const child of root.children) {
                nodes = nodes.concat(this.getNodesAtSpecificDepth(child, depth - 1));
            }
            return nodes;
        }
    }

    optimizeLod(lodTree: LodTree, levels: number): Array<{data: WeightedPointCloudData, boundingSphere: BoundingSphere, sphereData: PointCloudData}> {
        const optimizedLod: Array<{data: WeightedPointCloudData, boundingSphere: BoundingSphere, sphereData: PointCloudData}> = [];
        for (let level = 0; level < levels; level++) {
            const nodes = this.getNodesAtSpecificDepth(lodTree, level);
            const data = Geometry.mergeData(nodes);
            const boundingSphere = Geometry.getBoundingSphere(data.positions, data.sizes);
            const sphereData = PointCloudDataGenerator.generateBoundingSphere(boundingSphere);
            optimizedLod.push({data, boundingSphere, sphereData});
        }
        return optimizedLod;
    }

}
