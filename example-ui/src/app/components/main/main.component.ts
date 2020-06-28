import { Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import { RendererService } from '../../services/renderer.service';

@Component({
    selector: 'app-main',
    template: `
        <div #wrapper class="full-size">
            <canvas #canvas oncontextmenu="return false"></canvas>
        </div>
        <router-outlet></router-outlet>        
    `,
    styleUrls: ['./main.component.scss']
})
export class MainComponent implements OnInit {

    @ViewChild('canvas', {static: true}) canvasRef: ElementRef<HTMLCanvasElement>;
    @ViewChild('wrapper', {static: true}) wrapperRef: ElementRef<HTMLDivElement>;

    constructor(private rendererService: RendererService) {
    }

    ngOnInit(): void {
        this.rendererService.createRenderer(this.canvasRef.nativeElement, this.wrapperRef.nativeElement);
    }

    @HostListener('document:keydown', ['$event'])
    keyDown(e: KeyboardEvent) {
        this.rendererService.eventKeyDown(e);
    }

    @HostListener('document:keyup', ['$event'])
    keyUp(e: KeyboardEvent) {
        this.rendererService.eventKeyUp(e)
    }

    @HostListener('mousemove', ['$event'])
    mouseMove(e: MouseEvent) {
        this.rendererService.eventMouseMove(e);
    }

    @HostListener('window:blur')
    mouseLeave() {
        this.rendererService.eventMouseLeave();
    }

    @HostListener('window:wheel', ['$event'])
    mouseWheel(e: WheelEvent) {
        this.rendererService.eventMouseWheel(e);
    }

}
