import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { Renderer } from "../point-cloud-rendering/renderer/renderer";

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

    ngAfterViewInit(): void {
        this.renderer = new Renderer(this.canvasRef.nativeElement);
        this.renderLoop();
    }

    ngOnDestroy(): void {
        cancelAnimationFrame(this.animationRequest);
    }

    renderLoop() {
        this.animationRequest = requestAnimationFrame(() => this.renderLoop());
        this.checkCanvasSize();
        this.renderer.render();
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
