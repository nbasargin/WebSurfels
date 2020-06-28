import { AfterViewInit, Component } from '@angular/core';
import { RendererService } from '../../services/renderer.service';

import { Renderer } from 'web-surfels';

@Component({
    selector: 'app-lod-construction',
    template: `
        <p>
            lod-construction works!
        </p>
    `,
    styleUrls: ['./lod-construction-demo.component.scss']
})
export class LodConstructionDemoComponent implements AfterViewInit {

    private renderer: Renderer;

    constructor(private rendererService: RendererService) {
    }

    ngAfterViewInit(): void {
        this.renderer = this.rendererService.getRenderer();
    }

}
