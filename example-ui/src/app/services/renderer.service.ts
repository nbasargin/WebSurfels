import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { FpsCounter, Renderer } from 'web-surfels';

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
    private resizeTo: HTMLElement | null = null;

    nextFrame: Subject<void> = new Subject();
    fps = 0;

    createRenderer(canvas: HTMLCanvasElement, resizeTo: HTMLElement) {
        if (this.renderer) {
            console.warn('Recreating renderer!');
            this.destroyRenderer();
        }
        this.renderer = new Renderer(canvas, 1, 1);
        this.resizeTo = resizeTo;

        setTimeout(() => {
            this.renderLoop(0);
        });
    }

    destroyRenderer() {
        if (this.renderer) {
            this.renderer.removeAllNodes();
            cancelAnimationFrame(this.animationRequest);
            this.renderer = null;
            this.resizeTo = null;
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

    private renderLoop(timestamp) {
        if (!this.renderer || !this.resizeTo) {
            throw new Error('Render loop called with no renderer or resize-to element!');
        }

        // fps & next frame
        const duration = this.lastTimestamp > 0 ? timestamp - this.lastTimestamp : 0;
        this.lastTimestamp = timestamp;
        this.fpsCounter.addDuration(duration);
        this.fps = (1000 / this.fpsCounter.getAvgDuration());
        this.animationRequest = requestAnimationFrame(timestamp => this.renderLoop(timestamp));

        // canvas size
        const c = this.renderer.canvas;
        const bb = this.resizeTo.getBoundingClientRect();
        const resolution = window.devicePixelRatio || 1;
        const width = Math.round(bb.width * resolution);
        const height = Math.round(bb.height * resolution);
        if (c.width !== width || c.height !== height) {
            this.renderer.setCanvasSize(width, height);
            console.debug(`resizing canvas to ${width} x ${height}`);
        }

        // inform listeners
        this.nextFrame.next();
    }

}
