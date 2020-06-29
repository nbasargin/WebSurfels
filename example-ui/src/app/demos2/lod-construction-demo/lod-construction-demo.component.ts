import { Component } from '@angular/core';
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
export class LodConstructionDemoComponent {

    private renderer: Renderer;

    constructor(private rendererService: RendererService) {
        this.renderer = this.rendererService.getRenderer();
    }

}
