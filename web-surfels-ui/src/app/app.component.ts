import { AfterViewInit, Component, ElementRef, HostListener, OnDestroy, ViewChild } from '@angular/core';
import { FirstPersonController } from '../lib/renderer/camera/first-person-controller';
import { Renderer } from '../lib/renderer/renderer';
import { mat4, vec3 } from 'gl-matrix';
import { GSVPanoramaLoader } from '../lib/street-view/gsv-panorama-loader';
import { AnimatedCamera } from '../lib/utils/animated-camera';
import { FpsCounter } from '../lib/utils/fps-counter';
import { WeightedLodNode } from '../lib/level-of-detail/lod-node';
import { PointCloudData, WeightedPointCloudData } from '../lib/data/point-cloud-data';
import { BoundingSphere, Geometry } from '../lib/utils/geometry';
import { RendererNode } from '../lib/renderer/renderer-node';
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
                    <input #splatCheck type="checkbox" [checked]="splattingEnabled"
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
            <!--  used in axis demo
            <div>
                latitude: {{panoramaStitching.lat}}
            </div>
            <div>
                <input #panoSliderLatRot (input)="panoramaStitching.lat = +panoSliderLatRot.value; testAxis()"
                       type="range" min="-90" max="90" step="0" [value]="panoramaStitching.lat">
            </div>
            <div>
                longitude: {{panoramaStitching.lng}}
            </div>
            <div>
                <input #panoSliderLngRot (input)="panoramaStitching.lng = +panoSliderLngRot.value; testAxis()"
                       type="range" min="-180" max="180" step="1" [value]="panoramaStitching.lng">
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
    renderer2: Renderer;

    private pressedKeys: Set<string>;

    benchmarkRunning = false;
    splattingEnabled = true;
    private animatedCamera: AnimatedCamera = new AnimatedCamera(false);
    private controller: FirstPersonController;
    movementSpeed = 10;
    private fpsCounter: FpsCounter = new FpsCounter(20);
    private lastTimestamp = 0;

    weightedLodNode: WeightedLodNode;
    treeDepth: number;
    optimizedLod: Array<{ data: WeightedPointCloudData, boundingSphere: BoundingSphere, sphereData: PointCloudData }>;
    boundingSphere: BoundingSphere;
    sphereData: RendererNode;
    lodData: RendererNode;

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
        lat: 90,
        lng: 0,
    };

    constructor() {
        this.pressedKeys = new Set();
    }

    ngAfterViewInit(): void {
        this.renderer2 = new Renderer(this.canvasRef.nativeElement, 1, 1);
        this.controller = new FirstPersonController(this.renderer2.camera);
        setTimeout(() => {
            //const instances = 64;
            //this.createDragonLod2(32, 12);
            //this.testStreetViewStitching();
            //this.sphereTest(300000, 0.02, 4, 12);
            this.loadDynamicLod2(1.4);
            //this.testAxis(true);

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

        this.controller.addPitch(-e.movementY * 0.1);
        this.controller.addYaw(-e.movementX * 0.1);
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

        if (this.dynamicLod) {
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

        if (this.pressedKeys.has('KeyW')) {
            this.controller.moveForward(movementSpeed);
        }
        if (this.pressedKeys.has('KeyA')) {
            this.controller.moveRight(-movementSpeed);
        }
        if (this.pressedKeys.has('KeyS')) {
            this.controller.moveForward(-movementSpeed);
        }
        if (this.pressedKeys.has('KeyD')) {
            this.controller.moveRight(movementSpeed);
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
            this.renderer2.setCanvasSize(width, height);
            console.debug(`resizing canvas to ${width} x ${height}`);
        }
    }

    testStreetViewStitching() {
        this.renderer2.removeAllNodes();

        const options = {
            skyDistance: -1,
            maxNonSkySplatSize: 2,
            minNonSkySplatSize: 0.1,
        };
        const loader = new GSVPanoramaLoader(options);

        const panoIDsMuc = [
            'yoDO0JAidwhxwcrHkiiO2A',
            //'rUJScz5qeFNziiQQ2hMqjA',
            'HfTV_yDHhuJAxB_yMxcvhg',
            //'kqvWX70FEJ9QJDVSr9FYUA',
            'uqTmsw4aCg1TZvCNQMrASg',
            //'x_lmhPUhXWzj18awTDu8sg',
            'rGdyHoqO5yFBThYm8kiwpA',
            //'giDo-scRn5kbweSI5xmtIg',
            '-bgCziklvIHyyrav6R4aug',
            //'9ZPVekRqspFF5M0-ka2zTw',
            '6ZfcCQRcyZNdvEq0CGHKcQ',
        ];

        const panoIDs = [
            'GTKQkr3G-rRZQisDUMzUtg',
            'tDHgZF2towFDY0XScMdogA',
            'TX7hSqtNzoUQ3FHmd_B7jg',
            'DUC-bzTYi-qzKU43ZMy0Rw',
            '0ugKJC8FPlIqvIu7gUjXoA',
            'ziNa0wg33om0UUk_zGb16g',
            'FaTLGxzNsC77nmrZMKdBbQ',
        ];


        const loading = panoIDsMuc.map(id => loader.loadPanorama(id));
        Promise.all(loading).then(panoramas => {
            const middleID = Math.floor(panoramas.length / 2);
            const basePanorama = panoramas[middleID];

            const pos = basePanorama.worldPosition;
            const up = vec3.fromValues(pos.x, pos.y, pos.z);
            vec3.normalize(up, up);
            const cam = this.renderer2.camera;
            const height = 15;
            vec3.scaleAndAdd(cam.eye, cam.eye, up, height);
            vec3.scaleAndAdd(cam.target, cam.target, up, height);
            this.renderer2.camera.setOrientation(cam.eye, cam.target, up);
            this.controller.setViewDirection(-30, 90);

            for (const p of panoramas) {
                if (p !== basePanorama) {
                    // compute offset
                    const x = p.worldPosition.x - basePanorama.worldPosition.x;
                    const y = p.worldPosition.y - basePanorama.worldPosition.y;
                    const z = p.worldPosition.z - basePanorama.worldPosition.z;

                    const positions = p.data.positions;
                    for (let i = 0; i < positions.length; i+=3) {
                        positions[i] += x;
                        positions[i + 1] += y;
                        positions[i + 2] += z;
                    }
                }
                this.renderer2.addData(p.data);
            }

            this.renderer2.addData(PointCloudDataGenerator.genAxis());
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
            this.weightedLodNode = octree.buildLod();
            console.log(Timing.measure(), 'lod computed');
            this.optimizedLod = this.optimizeLod(this.weightedLodNode, octree.root.getDepth());
            console.log(Timing.measure(), 'lod optimized');

            this.overlayMessage = '';
            this.showLodLevel(0);
        });
    }

    loadDynamicLod2(sizeThreshold: number) {
        this.renderer2.camera.setOrientation(
            vec3.fromValues(70, 30, 80),
            vec3.create(),
            vec3.fromValues(0, 1, 0)
        );
        this.controller.setViewDirection(-20, 210);

        const loader = new XhrLodLoader('http://localhost:5000/');
        this.dynamicLod = new DynamicLodTree(this.renderer2, loader, sizeThreshold);
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
        this.renderer2.removeAllNodes();
        const nodes = this.getNodesAtSpecificDepth(this.weightedLodNode, lodLevel);
        this.displayInfo.octreeNodes = nodes.length;
        for (const node of nodes) {
            // this.renderer2.addData(node.positions, node.sizes, node.colors, node.normals);
        }

        const {data, boundingSphere, sphereData} = this.optimizedLod[lodLevel];
        this.displayInfo.renderedPoints = data.positions.length / 3;
        this.boundingSphere = boundingSphere;
        this.lodData = this.renderer2.addData(data);
        this.sphereData = this.renderer2.addData(sphereData);
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

    private testAxis() {

        this.renderer2.removeAllNodes();

        const center: PointCloudData = {
            positions: new Float32Array([0,0,0, 0,0,0, 0,0,0, 0,0,0.5, 0,0.5,0, 0.5,0,0]),
            normals: new Float32Array(  [1,0,0, 0,1,0, 0,0,1, 0,0,1,   0,1,0,   1,0,0]),
            colors: new Float32Array(   [1,0,0, 0,1,0, 0,0,1, 0,0,1,   0,1,0,   1,0,0]),
            sizes: new Float32Array(    [1,1,1, 0.5, 0.5, 0.5]),
        };
        this.renderer2.addData(center);

        const data: PointCloudData = {
            positions: new Float32Array([0,0,0, 0,0,0, 0,0,0,  0,0,0.5, 0,0.5,0, 0.5,0,0]),
            normals: new Float32Array(  [1,0,0, 0,1,0, 0,0,1,  0,0,1,   0,1,0,   1,0,0]),
            colors: new Float32Array(   [1,0,0, 0,1,0, 0,0,1,  0,0,1,   0,1,0,   1,0,0]),
            sizes: new Float32Array([0.5,0.5,0.5, 0.2, 0.2, 0.2]),
        };

        const normal2 = this.lngLatToNormal(this.panoramaStitching.lat, this.panoramaStitching.lng);
        this.rotateByLatLng(data, this.panoramaStitching.lat, this.panoramaStitching.lng);

        for (let i = 0; i < data.positions.length; i += 3) {
            data.positions[i] += normal2.x * 1.1;
            data.positions[i+1] += normal2.y * 1.1;
            data.positions[i+2] += normal2.z * 1.1;
        }

        this.renderer2.addData(data);
    }

    rotateByLatLng(data: PointCloudData, latitude: number, longitude: number) {
        // data up vector: (0, 0, 1)
        // for latitude = longitude = 0°, the transformed vector should be (1, 0, 0)

        latitude = -(latitude - 90) * Math.PI / 180;
        longitude = longitude * Math.PI / 180;

        const rotMatrix = mat4.create();
        mat4.rotateZ(rotMatrix, rotMatrix, longitude);
        mat4.rotateY(rotMatrix, rotMatrix, latitude);

        for (let i = 0; i < data.positions.length; i += 3) {
            const position = new Float32Array(data.positions.buffer, i * 4, 3);
            vec3.transformMat4(position, position, rotMatrix);
            const normal = new Float32Array(data.normals.buffer, i * 4, 3);
            vec3.transformMat4(normal, normal, rotMatrix);
        }
    }

    lngLatToNormal(latitude: number, longitude: number) {
        latitude = latitude * Math.PI / 180;
        longitude = longitude * Math.PI / 180;
        const x = Math.cos(latitude) * Math.cos(longitude);
        const y = Math.cos(latitude) * Math.sin(longitude);
        const z = Math.sin(latitude);

        return {x, y, z};
    }

}
