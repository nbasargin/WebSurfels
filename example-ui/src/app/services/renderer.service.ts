import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { FirstPersonController, FpsCounter, OrbitAnimationController, Renderer } from 'web-surfels';

export type ControlMode = 'disabled' | 'first-person' | 'orbit-animation';

/**
 * This service is responsible for:
 * - renderer creation
 * - resizing
 * - generating rendering loop events
 * - framerate computation
 */
@Injectable({
    providedIn: 'root'
})
export class RendererService {

    // render loop
    private fpsCounter: FpsCounter = new FpsCounter(20);
    private animationRequest;
    private lastTimestamp = 0;

    private renderer: Renderer | null = null;
    private resizeTo: HTMLElement;

    private pressedKeys: Set<string> = new Set();
    private fpController: FirstPersonController;
    private orbitAnimation: OrbitAnimationController;
    private controlMode: ControlMode = 'first-person';
    private movementSpeed: number;
    private minMovementSpeed: number;
    private maxMovementSpeed: number;

    nextFrame: Subject<number> = new Subject(); // emits frame duration in ms
    fps = 0;

    constructor() {
        this.setMovementSpeed(0.5);
    }

    createRenderer(canvas: HTMLCanvasElement, resizeTo: HTMLElement) {
        if (this.renderer) {
            console.warn('Recreating renderer!');
            this.destroyRenderer();
        }
        this.renderer = new Renderer(canvas);
        this.resizeTo = resizeTo;
        this.fpController = new FirstPersonController(this.renderer.camera);
        this.orbitAnimation = new OrbitAnimationController(this.renderer.camera, 30, 100, 30, 0, 100000);

        setTimeout(() => {
            this.renderLoop(0);
        });
    }

    destroyRenderer() {
        if (this.renderer) {
            this.renderer.removeAllNodes();
            cancelAnimationFrame(this.animationRequest);
            this.renderer = null;
        }
    }

    getRenderer(): Renderer {
        if (!this.renderer) {
            throw new Error('Renderer has not been initialized yet!');
        }
        return this.renderer;
    }

    setFpsAveragingWindow(numFrames) {
        this.fpsCounter = new FpsCounter(numFrames);
    }

    setControlMode(mode: ControlMode) {
        this.controlMode = mode;
    }

    setMovementSpeed(speed: number) {
        this.movementSpeed = speed;
        this.minMovementSpeed = speed / 100;
        this.maxMovementSpeed = speed * 200;
    }

    getMovementSpeed() {
        return this.movementSpeed;
    }

    setOrbitAnimation(minDistance: number, maxDistance: number, cameraElevation: number, rotationDuration: number, targetElevation = 0) {
        this.orbitAnimation.minDistance = minDistance;
        this.orbitAnimation.maxDistance = maxDistance;
        this.orbitAnimation.cameraElevation = cameraElevation;
        this.orbitAnimation.rotationDuration = rotationDuration;
        this.orbitAnimation.targetElevation = targetElevation;
    }

    // event processing

    eventMouseMove(e: MouseEvent) {
        if (
            this.controlMode !== 'first-person' ||
            (e.buttons & 1) !== 1 ||   // left mouse button not pressed
            !this.renderer ||
            e.target !== this.renderer.canvas
        ) {
            return;
        }

        this.fpController.addPitch(-e.movementY * 0.1);
        this.fpController.addYaw(-e.movementX * 0.1);
    }

    eventKeyDown(e: KeyboardEvent) {
        this.pressedKeys.add(e.code);
    }

    eventKeyUp(e: KeyboardEvent) {
        this.pressedKeys.delete(e.code);
    }

    eventMouseLeave() {
        this.pressedKeys.clear();
    }

    eventMouseWheel(e: WheelEvent) {
        const factor = 1.1;
        if (e.deltaY < 0) {
            this.movementSpeed *= factor;
        } else {
            this.movementSpeed /= factor;
        }
        this.movementSpeed = Math.max(this.minMovementSpeed, Math.min(this.maxMovementSpeed, this.movementSpeed));
    }

    private renderLoop(timestamp) {
        if (!this.renderer || !this.resizeTo) {
            throw new Error('Render loop called with no renderer or resize-to element!');
        }

        // fps & next frame
        const duration = this.lastTimestamp > 0 ? timestamp - this.lastTimestamp : 0;
        this.lastTimestamp = timestamp;
        this.fpsCounter.addDuration(duration);
        this.fps = Math.round((1000 / this.fpsCounter.getAvgDuration()) * 100) / 100;
        this.animationRequest = requestAnimationFrame(timestamp => this.renderLoop(timestamp));

        // canvas size
        const c = this.renderer.canvas;
        const bb = this.resizeTo.getBoundingClientRect();
        const resolution = Math.min(2, window.devicePixelRatio || 1); // limit resolution to 2 for high dpi screens
        const width = Math.round(bb.width * resolution);
        const height = Math.round(bb.height * resolution);
        if (c.width !== width || c.height !== height) {
            this.renderer.setCanvasSize(width, height);
            console.debug(`resizing canvas to ${width} x ${height}`);
        }

        // control
        if (this.controlMode === 'first-person') {
            this.updateFirstPersonCam();
        } else if (this.controlMode === 'orbit-animation') {
            this.orbitAnimation.animate(duration);
        }

        // inform listeners
        this.nextFrame.next(duration);
    }

    updateFirstPersonCam() {
        if (this.pressedKeys.has('KeyW')) {
            this.fpController.moveForward(this.movementSpeed);
        }
        if (this.pressedKeys.has('KeyA')) {
            this.fpController.moveRight(-this.movementSpeed);
        }
        if (this.pressedKeys.has('KeyS')) {
            this.fpController.moveForward(-this.movementSpeed);
        }
        if (this.pressedKeys.has('KeyD')) {
            this.fpController.moveRight(this.movementSpeed);
        }
    }

}
