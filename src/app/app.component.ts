import { AfterViewInit, Component, ElementRef, HostListener, OnDestroy, ViewChild } from '@angular/core';
import { vec3 } from 'gl-matrix';
import { AnimatedCamera } from '../point-cloud-rendering/benchmark/animated-camera';
import { FpsCounter } from '../point-cloud-rendering/benchmark/fps-counter';
import { StanfordDragonLoader } from '../point-cloud-rendering/data/stanford-dragon-loader';
import { Octree } from '../point-cloud-rendering/octree/octree';
import { StaticOctreeNode } from '../point-cloud-rendering/octree/static-octree-node';
import { Renderer2 } from '../point-cloud-rendering/renderer2/renderer2';

@Component({
    selector: 'app-root',
    template: `
        <div class="fps-overlay">FPS: {{fps}}</div>
        <div class="animation-overlay">
            <input #animCheck type="checkbox" (change)="benchmarkRunning = animCheck.checked">
            animate
        </div>
        <div #wrapper class="full-size">
            <canvas #canvas oncontextmenu="return false"></canvas>
        </div>
    `,
    styleUrls: ['app.component.scss']
})
export class AppComponent implements AfterViewInit, OnDestroy {

    @ViewChild('canvas', {static: true}) canvasRef: ElementRef<HTMLCanvasElement>;
    @ViewChild('wrapper', {static: true}) wrapperRef: ElementRef<HTMLDivElement>;
    fps = '0';

    private animationRequest;
    // private renderer: Renderer;
    private renderer2: Renderer2;
    private renderNormals: boolean = false;

    private readonly cameraPos: vec3;
    private readonly viewDirection: vec3;
    private readonly up: vec3;
    private angleX: number = 0;
    private angleY: number = 0;

    private pressedKeys: Set<string>;

    private benchmarkRunning = false;
    private animatedCamera: AnimatedCamera = new AnimatedCamera();
    private fpsCounter: FpsCounter = new FpsCounter(20);
    private lastTimestamp = 0;

    constructor() {
        this.cameraPos = vec3.fromValues(0, 0, 2.5);
        this.viewDirection = vec3.fromValues(0, 0, -1);
        this.up = vec3.fromValues(0,1, 0);
        this.pressedKeys = new Set();
    }

    ngAfterViewInit(): void {
        // this.renderer = new Renderer(this.canvasRef.nativeElement);
        this.renderer2 = new Renderer2(this.canvasRef.nativeElement, 1, 1);
        // const instances = 64;
        // this.addDragons(instances, Math.min(20, instances));
        this.addDragonLod(1, 10000, 10);

        this.renderLoop(0);
    }

    ngOnDestroy(): void {
        cancelAnimationFrame(this.animationRequest);
    }

    @HostListener('document:keydown', ['$event'])
    keyDown(e: KeyboardEvent) {
        this.pressedKeys.add(e.code);
        if (e.code == 'KeyN' && !e.repeat) {
            this.renderNormals = !this.renderNormals
        }
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

        const degreesPerPixel = -0.1;
        const radians = Math.PI / 180 ;
        const maxVerticalAngle = 85;
        vec3.set(this.viewDirection, 0, 0, -1);
        this.angleX += radians * e.movementX * degreesPerPixel;
        this.angleY += radians * e.movementY * degreesPerPixel;
        this.angleY = Math.max(radians * -maxVerticalAngle, Math.min(radians * maxVerticalAngle, this.angleY));

        vec3.rotateX(this.viewDirection, this.viewDirection, vec3.create(), this.angleY);
        vec3.rotateY(this.viewDirection, this.viewDirection, vec3.create(), this.angleX);
    }

    @HostListener('window:blur')
    mouseLeave() {
        this.pressedKeys.clear();
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

        // this.renderer.render(this.renderNormals);
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
        const movementSpeed = 0.05;
        const right = vec3.create();
        vec3.cross(right, this.viewDirection, this.up);
        vec3.normalize(right, right);
        const front = vec3.create();
        vec3.normalize(front, this.viewDirection);

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

        /*
        if (this.pressedKeys.has('KeyQ') && !this.renderer.useQuads) {
            console.log('Switching to quad rendering');
            this.renderer.useQuads = true;
        } else if (this.pressedKeys.has('KeyE') && this.renderer.useQuads) {
            console.log('Switching to ellipse rendering');
            this.renderer.useQuads = false;
        }
        */

        const viewTarget = vec3.add(vec3.create(), this.cameraPos, this.viewDirection);
        //this.renderer.lookAt(this.cameraPos, viewTarget, up);
        this.renderer2.setCameraOrientation(this.cameraPos, viewTarget, this.up);
    }

    checkCanvasSize() {
        const c = this.canvasRef.nativeElement;
        const w = this.wrapperRef.nativeElement;
        const bb = w.getBoundingClientRect();

        const resolution = window.devicePixelRatio || 1;
        const width = Math.round(bb.width * resolution);
        const height = Math.round(bb.height * resolution);

        if (c.width !== width || c.height !== height) {
            // this.renderer.setSize(width, height);
            this.renderer2.setCanvasSize(width, height);
            console.debug(`resizing canvas to ${width} x ${height}`);
        }
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

                for (let i = 0; i < data.positions.length; i+=3) {
                    data.positions[i] += dx;
                    data.positions[i+2] += dz;
                }

                this.renderer2.addData(data.positions, data.colors, data.normals);
            }

        });
    }

    addDragonLod(lodLevel: number, pointLimitPerNode: number, maxDepth: number) {
        // lod level starts with 0
        const dragonLoader = new StanfordDragonLoader();
        dragonLoader.load().then(data => {
            console.log('data loaded');

            const octree = new Octree(data, pointLimitPerNode, maxDepth);
            this.addNodesAtSpecificDepth(octree.root, lodLevel);
            console.log('added', this.renderer2.nodes.size, 'nodes at LOD level', lodLevel);
        });
    }

    addNodesAtSpecificDepth(node: StaticOctreeNode, depth: number) {
        if (depth <= 0 || node.children.length == 0) {
            this.renderer2.addData(node.pointPositions, node.pointColors, node.pointNormals);
            console.log('adding node that represents', node.representedPointNumber, 'points with', node.pointPositions.length / 3, 'points');
        } else {
            for (const child of node.children) {
                this.addNodesAtSpecificDepth(child, depth - 1);
            }
        }
    }

}
