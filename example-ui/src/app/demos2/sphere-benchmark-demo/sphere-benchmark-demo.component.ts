import { AfterViewInit, Component } from '@angular/core';
import { RendererService } from '../../services/renderer.service';

import { Renderer } from 'web-surfels';

@Component({
    selector: 'app-sphere-benchmark-demo',
    template: `
        <p>
            sphere-benchmark-demo works!
        </p>
    `,
    styleUrls: ['./sphere-benchmark-demo.component.scss']
})
export class SphereBenchmarkDemoComponent implements AfterViewInit {

    private renderer: Renderer;

    constructor(private rendererService: RendererService) {
    }

    ngAfterViewInit(): void {
        this.renderer = this.rendererService.getRenderer();
    }

}
