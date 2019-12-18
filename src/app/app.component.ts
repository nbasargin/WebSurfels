import { AfterViewInit, Component, ElementRef, HostListener, OnDestroy, ViewChild } from '@angular/core';
import { Renderer } from '../point-cloud-rendering/renderer/renderer';
import { vec3 } from 'gl-matrix';

@Component({
    selector: 'app-root',
    template: `
        <div #wrapper class="full-size">
            <canvas #canvas></canvas>
        </div>
    `,
    styleUrls: ['app.component.scss']
})
export class AppComponent implements AfterViewInit, OnDestroy {

    @ViewChild('canvas', {static: true}) canvasRef: ElementRef<HTMLCanvasElement>;
    @ViewChild('wrapper', {static: true}) wrapperRef: ElementRef<HTMLDivElement>;

    private animationRequest;
    private renderer: Renderer;

    private readonly cameraPos: vec3;
    private readonly viewTarget: vec3;
    private readonly up: vec3;

    private pressedKeys: Set<string>;

    constructor() {
        this.cameraPos = vec3.fromValues(0, 0, 2.5);
        this.viewTarget = vec3.create();
        this.up = vec3.fromValues(0,1, 0);
        this.pressedKeys = new Set();
    }

    ngAfterViewInit(): void {
        this.renderer = new Renderer(this.canvasRef.nativeElement);
        this.renderLoop();
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

    renderLoop() {
        this.animationRequest = requestAnimationFrame(() => this.renderLoop());
        this.checkCanvasSize();
        this.checkCamera();
        this.renderer.render();
    }

    checkCamera() {
        //console.log([...this.pressedKeys.values()]);
        const movementSpeed = 0.05;

        if (this.pressedKeys.has('KeyW')) {
            this.cameraPos[2] -= movementSpeed;
            this.viewTarget[2] -= movementSpeed;
        }
        if (this.pressedKeys.has('KeyA')) {
            this.cameraPos[0] -= movementSpeed;
            this.viewTarget[0] -= movementSpeed;
        }
        if (this.pressedKeys.has('KeyS')) {
            this.cameraPos[2] += movementSpeed;
            this.viewTarget[2] += movementSpeed;
        }
        if (this.pressedKeys.has('KeyD')) {
            this.cameraPos[0] += movementSpeed;
            this.viewTarget[0] += movementSpeed;
        }

        this.renderer.lookAt(this.cameraPos, this.viewTarget, [0, 1, 0]);
    }

    checkCanvasSize() {
        const c = this.canvasRef.nativeElement;
        const w = this.wrapperRef.nativeElement;
        const bb = w.getBoundingClientRect();

        const resolution = window.devicePixelRatio || 1;
        const width = Math.round(bb.width) * resolution;
        const height = Math.round(bb.height) * resolution;

        if (c.width !== width || c.height !== height) {
            c.width = width;
            c.height = height;
            console.debug(`resizing canvas to ${width} x ${height}`);
        }
    }
}
