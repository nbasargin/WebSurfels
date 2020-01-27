import { AfterViewInit, Component, ElementRef, HostListener, OnDestroy, ViewChild } from '@angular/core';
import { vec3 } from 'gl-matrix';
import { StanfordDragonLoader } from '../point-cloud-rendering/data/stanford-dragon-loader';
import { Renderer2 } from '../point-cloud-rendering/renderer2/renderer2';

@Component({
    selector: 'app-root',
    template: `
        <div #wrapper class="full-size">
            <canvas #canvas oncontextmenu="return false"></canvas>
        </div>
    `,
    styleUrls: ['app.component.scss']
})
export class AppComponent implements AfterViewInit, OnDestroy {

    @ViewChild('canvas', {static: true}) canvasRef: ElementRef<HTMLCanvasElement>;
    @ViewChild('wrapper', {static: true}) wrapperRef: ElementRef<HTMLDivElement>;

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

    constructor() {
        this.cameraPos = vec3.fromValues(0, 0, 2.5);
        this.viewDirection = vec3.fromValues(0, 0, -1);
        this.up = vec3.fromValues(0,1, 0);
        this.pressedKeys = new Set();
    }

    ngAfterViewInit(): void {
        // this.renderer = new Renderer(this.canvasRef.nativeElement);
        this.renderer2 = new Renderer2(this.canvasRef.nativeElement, 1, 1);

        const dragonLoader = new StanfordDragonLoader();
        dragonLoader.load().then(data => {
            console.log('data loaded', data);

            for (let instances = 0; instances < 1; instances++) {
                this.renderer2.addData(data.positions, data.colors, data.normals);
                for (let i = 0; i < data.positions.length; i+=3) {
                    data.positions[i+2] -= 10;
                }
            }

        });
        this.renderLoop();
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

    renderLoop() {
        this.animationRequest = requestAnimationFrame(() => this.renderLoop());
        this.checkCanvasSize();
        this.checkCamera();
        // this.renderer.render(this.renderNormals);
        this.renderer2.render();
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
}
