import { AfterViewInit, Component, ElementRef, HostListener, OnDestroy, ViewChild } from '@angular/core';
import { Renderer2 } from '../lib/renderer2/renderer2';
import { vec3 } from 'gl-matrix';
import { ViewDirection } from '../lib/renderer2/view-direction';
import { AnimatedCamera } from '../lib/utils/animated-camera';
import { FpsCounter } from '../lib/utils/fps-counter';
import { WeightedLodNode } from '../lib/level-of-detail/lod-node';
import { PointCloudData, WeightedPointCloudData } from '../lib/data/point-cloud-data';
import { BoundingSphere, Geometry } from '../lib/utils/geometry';
import { RendererNode } from '../lib/renderer2/renderer-node';
import { CullingTree } from '../lib/culling-tree/culling-tree';
import { PointCloudFactory } from '../lib/street-view/point-cloud-factory';
import { PanoramaLoader } from '../lib/street-view/panorama-loader';
import { DepthData } from '../lib/street-view/depth-data';
import { StanfordDragonLoader } from '../lib/data/stanford-dragon-loader';
import { Timing } from '../lib/utils/timing';
import { OctreeLodBuilder } from '../lib/level-of-detail/octree-lod-buider/octree-lod-builder';
import { PointCloudDataGenerator } from '../lib/data/point-cloud-data-generator';
import { DynamicLodTree } from '../dynamic-lod/dynamic-lod-tree';
import { XhrLodLoader } from '../dynamic-lod/xhr-lod-loader';

@Component({
    selector: 'app-root',
    template: `
        <div class="main-overlay">
            <div>FPS: {{fps}}</div>
            <div></div>
            <div>
                <label>
                    <input #animCheck type="checkbox" [checked]="benchmarkRunning"
                           (change)="benchmarkRunning = animCheck.checked">
                    Animate
                </label>
            </div>
            <div>
                <label>
                    <input #splatCheck type="checkbox" [checked]="true"
                           (change)="splattingEnabled = splatCheck.checked">
                    HQ splats
                </label>
            </div>
            <div>
                Size scale: {{sizeScaleSlider.value}}
            </div>
            <div>
                <input #sizeScaleSlider (input)="renderer2.setSplatSizeScale(+sizeScaleSlider.value) "
                       type="range" min="0.2" max="2" step="0.1" value="1">
            </div>

            <!--
            <div>
                pano scale X: {{panoramaStitching.scaleX}}
            </div>
            <div>
                <input #panoSliderScaleX (input)="panoramaStitching.scaleX = +panoSliderScaleX.value"
                       type="range" min="0.0" max="2" step="0.001" value="1">
            </div>
            <div>
                pano scale Y: {{panoramaStitching.scaleY}}
            </div>
            <div>
                <input #panoSliderScaleY (input)="panoramaStitching.scaleY = +panoSliderScaleY.value"
                       type="range" min="-2" max="3" step="0.01" value="1">
            </div>

            <div>
                pano angleY: {{panoramaStitching.angleY}}
            </div>
            <div>
                <input #panoSliderAngleY (input)="panoramaStitching.angleY = +panoSliderAngleY.value"
                       type="range" min="-5" max="5" step="0.1" value="1">
            </div>
            <div>
                pano angleZ: {{panoramaStitching.angleZ}}
            </div>
            <div>
                <input #panoSliderAngleZ (input)="panoramaStitching.angleZ = +panoSliderAngleZ.value"
                       type="range" min="0.5" max="1.5" step="0.001" value="1">
            </div>
            <div>
                <button (click)="reloadPano()">RELOAD</button>
            </div>
            -->

        </div>
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
            {{frustumInfo}}
        </div>
        <div class="lod-overlay" *ngIf="rendererDetails">
            Nodes rendered: {{rendererDetails.nodesDrawn}}<br>
            Points rendered: {{rendererDetails.pointsDrawn}}<br>
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
    fps = '0';

    private animationRequest;
    renderer2: Renderer2;

    private readonly cameraPos: vec3;
    private view: ViewDirection;
    private angleX: number = Math.PI / 180 * -27;
    private angleY: number = Math.PI / 180 * -22;
    movementSpeed = 10;

    private pressedKeys: Set<string>;

    benchmarkRunning = false;
    splattingEnabled = true;
    private animatedCamera: AnimatedCamera = new AnimatedCamera(false);
    private fpsCounter: FpsCounter = new FpsCounter(20);
    private lastTimestamp = 0;

    weightedLodNode: WeightedLodNode;
    treeDepth: number;
    optimizedLod: Array<{ data: WeightedPointCloudData, boundingSphere: BoundingSphere, sphereData: PointCloudData }>;
    boundingSphere: BoundingSphere;
    sphereData: RendererNode;
    lodData: RendererNode;

    private cullingTree: CullingTree;
    dynamicLod: DynamicLodTree;
    rendererDetails: { nodesDrawn: number, pointsDrawn: number };

    displayInfo = {
        totalPoints: 0,
        renderedPoints: 0,
        octreeNodes: 0
    };

    overlayMessage = '';
    frustumInfo = '';

    panoramaStitching = {
        scaleX: 1,
        scaleY: 1,
        angleY: 1,
        angleZ: 1
    };

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
            //this.createDragonLod2(32, 12);
            this.testStreetViewStitching();
            //this.castleTest(64, 12, 0.25);
            //this.sphereTest(300000, 0.02, 4, 12);
            //this.createDynamicLod(64, 12, 0.20);
            //this.loadDynamicLod2(1.4);

            this.renderLoop(0);
        }, 0);
    }

    ngOnDestroy(): void {
        cancelAnimationFrame(this.animationRequest);
        this.renderer2.removeAllNodes();
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

        } else if (this.dynamicLod) {
            this.dynamicLod.render(!this.splattingEnabled);
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

    reloadPano() {
        this.renderer2.removeAllNodes();
        this.testStreetViewStitching();
        this.colorCounter = 0;
    }

    testStreetViewStitching() {
        this.view = new ViewDirection(true);
        this.animatedCamera = new AnimatedCamera(true);
        this.view.update(this.angleX, this.angleY);
        const factory = new PointCloudFactory();

        const panoIDs = [
            'GTKQkr3G-rRZQisDUMzUtg',
            //'tDHgZF2towFDY0XScMdogA',
            //'TX7hSqtNzoUQ3FHmd_B7jg',
            'DUC-bzTYi-qzKU43ZMy0Rw',
            //'0ugKJC8FPlIqvIu7gUjXoA',
            //'ziNa0wg33om0UUk_zGb16g',
            'FaTLGxzNsC77nmrZMKdBbQ',
        ];

        const panoIDsMuc = [
            /*'yoDO0JAidwhxwcrHkiiO2A',
            'rUJScz5qeFNziiQQ2hMqjA',
            'HfTV_yDHhuJAxB_yMxcvhg',*/
            'kqvWX70FEJ9QJDVSr9FYUA',
            /*'uqTmsw4aCg1TZvCNQMrASg',
            'x_lmhPUhXWzj18awTDu8sg',
            'rGdyHoqO5yFBThYm8kiwpA',
            'giDo-scRn5kbweSI5xmtIg',
            '-bgCziklvIHyyrav6R4aug',
            '9ZPVekRqspFF5M0-ka2zTw',
            '6ZfcCQRcyZNdvEq0CGHKcQ',*/
        ];

        PanoramaLoader.loadById(panoIDsMuc[0]).then(pano => {
            const offsets = this.coordsToOffset(+pano.Location.lat, +pano.Location.lng); // or use original lat / lng?
            const baseXOffset = offsets.xOffset;
            const baseZOffset = offsets.zOffset;

            for (const id of panoIDsMuc) {
                this.loadPano(id, factory, baseXOffset, baseZOffset);
            }

        });
    }

    private loadPano(id: string, factory: PointCloudFactory, baseXOffset: number, baseZOffset: number) {
        Promise.all([
            PanoramaLoader.loadById(id),
            PanoramaLoader.loadImage(id, 0, 0, 0),
        ]).then(([pano, bitmap]) => {
            console.log('loaded pano with id ', id, 'projection', pano.Projection);

            const imageWidth = +pano.Data.image_width / (2 ** +pano.Location.zoomLevels);
            const imageHeight = +pano.Data.image_height / (2 ** +pano.Location.zoomLevels);

            const depth = new DepthData(pano.model.depth_map);
            const pointCloud = factory.constructPointCloud(bitmap, imageWidth, imageHeight, depth, -1, 5);

            const angleZ = +pano.Projection.pano_yaw_deg * Math.PI / 180;
            this.rotateDataZ(pointCloud, -angleZ * this.panoramaStitching.angleZ);

            const angleX = +pano.Projection.tilt_pitch_deg * Math.PI / 180;
            //this.rotateDataY(pointCloud, angleX * this.panoramaStitching.angleY);

            //this.colorizeData(pointCloud);

            const offsets = this.coordsToOffset(+pano.Location.lat, +pano.Location.lng); // or use original lat / lng?
            const xDiff = baseXOffset - offsets.xOffset;
            const zDiff = baseZOffset - offsets.zOffset;

            const scale = 0.745;
            for (let i = 0; i < pointCloud.positions.length; i += 3) {
                pointCloud.positions[i] -= xDiff * scale * this.panoramaStitching.scaleX;
                pointCloud.positions[i + 1] += zDiff * scale * this.panoramaStitching.scaleY;
            }

            this.renderer2.addData(pointCloud.positions, pointCloud.sizes, pointCloud.colors, pointCloud.normals);
        })
    }


    rotateDataZ(data: PointCloudData, angle: number) {
        const zero = vec3.fromValues(0, 0, 0);
        for (let i = 0; i < data.positions.length; i += 3) {
            const point = new Float32Array(data.positions.buffer, i * 4, 3);
            vec3.rotateZ(point, point, zero, angle);
            const point2 = new Float32Array(data.normals.buffer, i * 4, 3);
            vec3.rotateZ(point2, point2, zero, angle);
        }
    }

    rotateDataY(data: PointCloudData, angle: number) {
        const zero = vec3.fromValues(0, 0, 0);
        for (let i = 0; i < data.positions.length; i += 3) {
            const point = new Float32Array(data.positions.buffer, i * 4, 3);
            vec3.rotateY(point, point, zero, angle);
            const point2 = new Float32Array(data.normals.buffer, i * 4, 3);
            vec3.rotateY(point2, point2, zero, angle);
        }
    }

    colorCounter = 0;

    colorizeData(data: PointCloudData) {
        const r = (Math.sin(this.colorCounter++) + 1) / 2 * 0.8 + 0.2;
        const g = (Math.sin(this.colorCounter++) + 1) / 2 * 0.8 + 0.2;
        const b = (Math.sin(this.colorCounter++) + 1) / 2 * 0.8 + 0.2;

        for (let i = 0; i < data.colors.length; i += 3) {
            data.colors[i] = r;
            data.colors[i + 1] = g;
            data.colors[i + 2] = b;
        }
    }

    coordsToOffset(latitude: number, longitude: number) {
        const halfEarthCircumference = 20037508.34;
        // todo optimize numerics
        const xOffset = longitude * halfEarthCircumference / 180;
        const zOffset = Math.log(Math.tan((90 + latitude) * Math.PI / 360)) / (Math.PI / 180) * halfEarthCircumference / 180;
        return {xOffset, zOffset};
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
            this.weightedLodNode = octree.buildLod();
            console.log(Timing.measure(), 'lod computed');
            this.cullingTree = new CullingTree(this.renderer2, sizeThreshold, this.weightedLodNode);
            console.log(Timing.measure(), 'culling ready');
            this.overlayMessage = '';
        });
    }

    loadDynamicLod2(sizeThreshold: number) {
        // castle cam config
        vec3.set(this.cameraPos, -90, 23, 92);
        this.angleX = -0.69;
        this.angleY = -0.29;
        this.view.update(this.angleX, this.angleY);

        const loader = new XhrLodLoader('http://localhost:5000/');
        this.dynamicLod = new DynamicLodTree(this.renderer2, loader, sizeThreshold);
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
            this.weightedLodNode = octree.buildLod();
            console.log(Timing.measure(), 'LOD created');
            this.cullingTree = new CullingTree(this.renderer2, sizeThreshold, this.weightedLodNode);
            console.log(Timing.measure(), 'culling ready');
            this.weightedLodNode = null as any;
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
        this.weightedLodNode = octree.buildLod();
        console.log(Timing.measure(), 'lod computed');
        this.optimizedLod = this.optimizeLod(this.weightedLodNode, this.treeDepth + 1);
        console.log(Timing.measure(), 'lod optimized');
        this.showLodLevel(0);
    }

    showLodLevel(lodLevel: number) {
        this.renderer2.removeAllNodes();
        const nodes = this.getNodesAtSpecificDepth(this.weightedLodNode, lodLevel);
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
