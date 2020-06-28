import { Injectable } from '@angular/core';
import { Renderer } from 'web-surfels';

@Injectable({
    providedIn: 'root'
})
export class RendererService {

    private renderer: Renderer | null = null;

    createRenderer(canvas: HTMLCanvasElement) {
        if (this.renderer) {
            console.warn('Recreating renderer!');
            this.destroyRenderer();
        }
        this.renderer = new Renderer(canvas, 1, 1);
    }

    destroyRenderer() {
        if (this.renderer) {
            this.renderer.removeAllNodes();
            this.renderer = null;
        }
    }

    getRenderer(): Renderer {
        if (!this.renderer) {
            throw new Error('Renderer has not been initialized yet!');
        }
        return this.renderer;
    }


}
