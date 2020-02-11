import { AfterViewInit, Component, ElementRef, HostListener, OnDestroy, ViewChild } from '@angular/core';
import { vec3 } from 'gl-matrix';
import { AnimatedCamera } from '../point-cloud-rendering/benchmark/animated-camera';
import { FpsCounter } from '../point-cloud-rendering/benchmark/fps-counter';
import { PointCloudData } from '../point-cloud-rendering/data/point-cloud-data';
import { StanfordDragonLoader } from '../point-cloud-rendering/data/stanford-dragon-loader';
import { LodNode } from '../point-cloud-rendering/octree2/lod-node';
import { Octree2 } from '../point-cloud-rendering/octree2/octree2';
import { Renderer2 } from '../point-cloud-rendering/renderer2/renderer2';
import { ViewDirection } from '../point-cloud-rendering/renderer2/view-direction';
import { DepthData } from '../street-view/depth-data';
import { PanoramaLoader } from '../street-view/panorama-loader';
import { PointCloudFactory } from '../street-view/point-cloud-factory';

@Component({
    selector: 'app-root',
    template: `
        <div class="fps-overlay">FPS: {{fps}}</div>
        <div class="animation-overlay flex-line">
            <input #animCheck type="checkbox" [checked]="false" (change)="benchmarkRunning = animCheck.checked">
            animate
        </div>
        <div class="info-overlay">
            movement speed: {{movementSpeed.toFixed(2)}}
        </div>
        <div class="lod-overlay" *ngIf="dragonLod">
            <div class="flex-line">
                LoD level:
                <input #lodSlider2 (input)="showDragonLoD2(+lodSlider2.value)" type="range" min="0"
                       max="{{optimizedLod.length - 1}}" step="1" value="3">
                {{+lodSlider2.value === optimizedLod.length - 1 ? 'original data' : lodSlider2.value}}
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
    private movementSpeed = 1;

    private pressedKeys: Set<string>;

    benchmarkRunning = false;
    private animatedCamera: AnimatedCamera = new AnimatedCamera();
    private fpsCounter: FpsCounter = new FpsCounter(20);
    private lastTimestamp = 0;

    dragonLod: LodNode;
    optimizedLod: Array<PointCloudData>;

    displayInfo = {
        totalPoints: 0,
        renderedPoints: 0,
        octreeNodes: 0
    };

    overlayMessage = '';

    constructor() {
        this.cameraPos = vec3.fromValues(-2, 1.2, 2.5);
        this.view = new ViewDirection(true);
        this.pressedKeys = new Set();
    }

    ngAfterViewInit(): void {
        this.renderer2 = new Renderer2(this.canvasRef.nativeElement, 1, 1);
        this.view.update(this.angleX, this.angleY);
        //const instances = 64;
        //this.addDragons(instances, Math.min(20, instances));
        //this.createDragonLod2(8, 10);
        this.testStreetView();

        this.renderLoop(0);
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

        this.renderer2.render();
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

    addDragons(instances: number, keepEveryNthPoint: number) {

        const dragonLoader = new StanfordDragonLoader();

        dragonLoader.load(keepEveryNthPoint).then(data => {
            console.log('data loaded');

            let x = 0;
            let z = 0;
            const sideLength = Math.floor(Math.sqrt(instances));
            const spacing = 4;

            for (let inst = 0; inst < instances; inst++) {
                const goalX = ((inst % sideLength) - sideLength / 2) * spacing;
                const goalZ = (Math.floor(inst / sideLength) - sideLength / 2) * spacing;

                const dx = goalX - x;
                const dz = goalZ - z;

                x = goalX;
                z = goalZ;

                for (let i = 0; i < data.positions.length; i += 3) {
                    data.positions[i] += dx;
                    data.positions[i + 2] += dz;
                }

                this.renderer2.addData(data.positions, data.sizes, data.colors, data.normals);
            }

        });
    }

    createDragonLod2(resolution: number, maxDepth: number) {
        this.overlayMessage = 'Loading...';
        const dragonLoader = new StanfordDragonLoader();
        dragonLoader.loadDropbox().then(data => {
            console.log('data loaded');
            this.displayInfo.totalPoints = data.positions.length / 3;

            const octree = new Octree2(data, resolution, maxDepth);
            this.dragonLod = octree.createLOD();
            this.optimizedLod = [];

            for (let level = 0; level < octree.root.getDepth(); level++) {
                const nodes = this.getNodesAtSpecificDepth(this.dragonLod, level);
                this.optimizedLod.push(this.mergeGeometry(nodes));
            }

            this.optimizedLod.push(data); // last level is the original

            this.overlayMessage = '';
            this.showDragonLoD2(3);
        });
    }

    showDragonLoD2(lodLevel: number) {
        this.renderer2.removeAllNodes();
        const nodes = this.getNodesAtSpecificDepth(this.dragonLod, lodLevel);
        this.displayInfo.octreeNodes = nodes.length;
        for (const node of nodes) {
            // this.renderer2.addData(node.positions, node.sizes, node.colors, node.normals);
        }

        const data = this.optimizedLod[lodLevel];
        this.displayInfo.renderedPoints = data.positions.length / 3;
        this.renderer2.addData(data.positions, data.sizes, data.colors, data.normals);
    }

    getNodesAtSpecificDepth(root: LodNode, depth: number): Array<LodNode> {
        if (depth <= 0 || root.children.length == 0) {
            return [root];
        } else {
            let nodes: Array<LodNode> = [];
            for (const child of root.children) {
                nodes = nodes.concat(this.getNodesAtSpecificDepth(child, depth - 1));
            }
            return nodes;
        }
    }

    mergeGeometry(nodes: Array<LodNode>): PointCloudData {
        let points = 0;
        for (const node of nodes) {
            points += node.positions.length / 3;
        }
        const merged = {
            positions: new Float32Array(points * 3),
            sizes: new Float32Array(points),
            colors: new Float32Array(points * 3),
            normals: new Float32Array(points * 3),
        };
        let writePos = 0;
        for (const node of nodes) {
            merged.positions.set(node.positions, writePos * 3);
            merged.sizes.set(node.sizes, writePos);
            merged.colors.set(node.colors, writePos * 3);
            merged.normals.set(node.normals, writePos * 3);
            writePos += node.positions.length / 3;
        }
        return merged;
    }

}
