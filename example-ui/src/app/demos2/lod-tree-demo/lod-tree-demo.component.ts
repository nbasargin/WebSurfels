import { Component } from '@angular/core';
import { RendererService } from '../../services/renderer.service';

import { Renderer } from 'web-surfels';

@Component({
    selector: 'app-lod-tree-demo',
    template: `
        <p>
            LOD Tree demo works!
        </p>
    `,
    styleUrls: ['./lod-tree-demo.component.scss']
})
export class LodTreeDemoComponent {

    private renderer: Renderer;

    constructor(private rendererService: RendererService) {
        this.renderer = this.rendererService.getRenderer();
    }

}
